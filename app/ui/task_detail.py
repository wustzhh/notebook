from PyQt6.QtWidgets import (
    QFrame, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QTextEdit, QComboBox, QPushButton, QDateEdit, QMessageBox,
    QScrollArea, QWidget, QFormLayout
)
from PyQt6.QtCore import Qt, QPropertyAnimation, QPoint, QDate
from PyQt6.QtGui import QFont

from .styles import *


class TaskDetailPanel(QFrame):
    def __init__(self, main_window):
        super().__init__()
        self.main_window = main_window
        self.task = None
        self.has_unsaved_changes = False
        self.is_visible = False
        
        self.setObjectName("detailPanel")
        self.setFixedWidth(DETAIL_PANEL_WIDTH)
        
        self.setup_ui()
    
    def setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        
        header = self.create_header()
        layout.addWidget(header)
        
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_area.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        scroll_area.setStyleSheet(f"QScrollArea {{ border: none; background-color: transparent; }}")
        
        content = QWidget()
        self.content_layout = QVBoxLayout(content)
        self.content_layout.setContentsMargins(24, 20, 24, 24)
        self.content_layout.setSpacing(20)
        
        self.key_label = QLabel("TASK-1")
        self.key_label.setStyleSheet(f"color: {NEUTRAL_80}; font-size: 14px;")
        self.content_layout.addWidget(self.key_label)
        
        self.title_input = QLineEdit()
        self.title_input.setPlaceholderText("添加摘要")
        self.title_input.setObjectName("detailInput")
        self.title_input.setFixedHeight(40)
        self.title_input.textChanged.connect(self.on_change)
        self.content_layout.addWidget(self.title_input)
        
        self.create_field("类型", "📋 任务")
        self.create_field("状态", self.create_status_selector())
        self.create_field("经办人", "👤 未分配")
        self.create_field("优先级", "🔴 高")
        
        dates_widget = QWidget()
        dates_layout = QHBoxLayout(dates_widget)
        dates_layout.setContentsMargins(0, 0, 0, 0)
        dates_layout.setSpacing(12)
        
        self.start_date = QDateEdit()
        self.start_date.setCalendarPopup(True)
        self.start_date.dateChanged.connect(self.on_change)
        self.end_date = QDateEdit()
        self.end_date.setCalendarPopup(True)
        self.end_date.dateChanged.connect(self.on_change)
        
        dates_layout.addWidget(QLabel("开始:"))
        dates_layout.addWidget(self.start_date)
        dates_layout.addWidget(QLabel("截止:"))
        dates_layout.addWidget(self.end_date)
        
        self.content_layout.addWidget(QLabel("日期"))
        self.content_layout.addWidget(dates_widget)
        
        self.content_layout.addWidget(QLabel("描述"))
        self.description_editor = QTextEdit()
        self.description_editor.setObjectName("detailEditor")
        self.description_editor.setPlaceholderText("添加描述...")
        self.description_editor.setMinimumHeight(150)
        self.description_editor.textChanged.connect(self.on_change)
        self.content_layout.addWidget(self.description_editor)
        
        scroll_area.setWidget(content)
        layout.addWidget(scroll_area, 1)
        
        footer = self.create_footer()
        layout.addWidget(footer)
    
    def create_header(self):
        header = QFrame()
        header.setStyleSheet(f"""
            QFrame {{
                background-color: {NEUTRAL_0};
                border-bottom: 1px solid {NEUTRAL_40};
            }}
        """)
        header.setFixedHeight(60)
        
        layout = QHBoxLayout(header)
        layout.setContentsMargins(20, 12, 20, 12)
        
        title_label = QLabel("问题详情")
        title_label.setStyleSheet(f"color: {NEUTRAL_120}; font-size: 16px; font-weight: 600;")
        layout.addWidget(title_label)
        
        layout.addStretch()
        
        self.close_btn = QPushButton("✕")
        self.close_btn.setObjectName("navBtn")
        self.close_btn.setFixedSize(32, 32)
        self.close_btn.clicked.connect(self.request_close)
        layout.addWidget(self.close_btn)
        
        return header
    
    def create_field(self, label_text, value_widget):
        container = QWidget()
        layout = QVBoxLayout(container)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(6)
        
        label = QLabel(label_text)
        label.setStyleSheet(f"color: {NEUTRAL_80}; font-size: 12px; font-weight: 600;")
        layout.addWidget(label)
        
        if isinstance(value_widget, str):
            value_label = QLabel(value_widget)
            value_label.setStyleSheet(f"color: {NEUTRAL_120}; font-size: 14px;")
            layout.addWidget(value_label)
        else:
            layout.addWidget(value_widget)
        
        self.content_layout.addWidget(container)
    
    def create_status_selector(self):
        combo = QComboBox()
        combo.addItems(["待处理", "进行中", "已完成"])
        combo.currentTextChanged.connect(self.on_change)
        return combo
    
    def create_footer(self):
        footer = QFrame()
        footer.setStyleSheet(f"""
            QFrame {{
                background-color: {NEUTRAL_0};
                border-top: 1px solid {NEUTRAL_40};
            }}
        """)
        footer.setFixedHeight(70)
        
        layout = QVBoxLayout(footer)
        layout.setContentsMargins(24, 12, 24, 12)
        
        btn_layout = QHBoxLayout()
        btn_layout.addStretch()
        
        self.delete_btn = QPushButton("删除")
        self.delete_btn.setStyleSheet(f"""
            QPushButton {{
                background-color: transparent;
                color: {ERROR};
                border: none;
                padding: 8px 16px;
                border-radius: 3px;
                font-size: 14px;
            }}
            QPushButton:hover {{
                background-color: {ERROR_LIGHT};
            }}
        """)
        btn_layout.addWidget(self.delete_btn)
        
        self.cancel_btn = QPushButton("取消")
        self.cancel_btn.setObjectName("detailBtnSecondary")
        self.cancel_btn.setFixedHeight(36)
        self.cancel_btn.clicked.connect(self.request_close)
        btn_layout.addWidget(self.cancel_btn)
        
        self.save_btn = QPushButton("保存")
        self.save_btn.setObjectName("detailBtn")
        self.save_btn.setFixedHeight(36)
        self.save_btn.clicked.connect(self.save_task)
        btn_layout.addWidget(self.save_btn)
        
        layout.addLayout(btn_layout)
        
        return footer
    
    def load_task(self, task):
        self.task = task
        self.has_unsaved_changes = False
        
        self.key_label.setText(f"TASK-{task.id}")
        self.title_input.setText(task.title)
        
        status_map = {"todo": "待处理", "in_progress": "进行中", "done": "已完成"}
        status_text = status_map.get(task.status, "待处理")
        
        self.description_editor.setText(task.description or "")
        
        if task.start_date:
            self.start_date.setDate(QDate.fromString(str(task.start_date), "yyyy-MM-dd"))
        else:
            self.start_date.setDate(QDate.currentDate())
        
        if task.end_date:
            self.end_date.setDate(QDate.fromString(str(task.end_date), "yyyy-MM-dd"))
        else:
            self.end_date.setDate(QDate.currentDate().addDays(7))
    
    def on_change(self):
        self.has_unsaved_changes = True
    
    def request_close(self):
        if self.has_unsaved_changes:
            reply = QMessageBox.question(
                self,
                "未保存的更改",
                "您有未保存的更改，是否保存？",
                QMessageBox.StandardButton.Save | 
                QMessageBox.StandardButton.Discard | 
                QMessageBox.StandardButton.Cancel
            )
            
            if reply == QMessageBox.StandardButton.Save:
                self.save_task()
            elif reply == QMessageBox.StandardButton.Discard:
                self.has_unsaved_changes = False
                self.slide_out()
            else:
                return
        else:
            self.slide_out()
    
    def save_task(self):
        if self.task:
            self.task.title = self.title_input.text().strip()
            self.task.description = self.description_editor.toPlainText()
            self.task.start_date = self.start_date.date().toString("yyyy-MM-dd")
            self.task.end_date = self.end_date.date().toString("yyyy-MM-dd")
            
            self.task.save()
            self.has_unsaved_changes = False
            
            self.main_window.task_list_view.load_tasks()
            self.slide_out()
    
    def slide_in(self):
        parent = self.parent()
        if parent:
            self.move(parent.width(), 0)
            self.show()
            
            self.animation = QPropertyAnimation(self, b"pos")
            self.animation.setDuration(250)
            self.animation.setStartValue(QPoint(parent.width(), 0))
            self.animation.setEndValue(QPoint(parent.width() - self.width(), 0))
            self.animation.start()
            
            self.is_visible = True
    
    def slide_out(self):
        parent = self.parent()
        if parent:
            self.animation = QPropertyAnimation(self, b"pos")
            self.animation.setDuration(250)
            self.animation.setStartValue(self.pos())
            self.animation.setEndValue(QPoint(parent.width(), 0))
            self.animation.finished.connect(self.hide)
            self.animation.start()
            
            self.is_visible = False
