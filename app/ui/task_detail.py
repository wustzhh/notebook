from PyQt6.QtWidgets import (
    QFrame, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QTextEdit, QComboBox, QPushButton, QDateEdit, QMessageBox,
    QScrollArea, QWidget
)
from PyQt6.QtCore import Qt, QDate

from .styles import *


class TaskDetailPanel(QFrame):
    def __init__(self, main_window):
        super().__init__()
        self.main_window = main_window
        self.task = None
        self.has_unsaved_changes = False
        
        self.setObjectName("detailPanel")
        self.setFixedWidth(0)
        self.setMinimumWidth(0)
        self.setMaximumWidth(DETAIL_PANEL_WIDTH)
        
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
        scroll_area.setStyleSheet("QScrollArea { border: none; background-color: transparent; }")
        
        content = QWidget()
        self.content_layout = QVBoxLayout(content)
        self.content_layout.setContentsMargins(24, 20, 24, 20)
        self.content_layout.setSpacing(20)
        
        self.key_label = QLabel("TASK-1")
        self.key_label.setStyleSheet(f"color: {NEUTRAL_80}; font-size: 14px;")
        self.content_layout.addWidget(self.key_label)
        
        self.title_input = QLineEdit()
        self.title_input.setPlaceholderText("添加摘要")
        self.title_input.setObjectName("detailInput")
        self.title_input.setFixedHeight(44)
        self.title_input.textChanged.connect(self.on_change)
        self.content_layout.addWidget(self.title_input)
        
        self.status_label = QLabel("状态")
        self.status_label.setObjectName("detailLabel")
        self.content_layout.addWidget(self.status_label)
        
        self.status_combo = QComboBox()
        self.status_combo.addItems(["待处理", "进行中", "已完成"])
        self.status_combo.setObjectName("detailInput")
        self.status_combo.setFixedHeight(44)
        self.status_combo.currentTextChanged.connect(self.on_change)
        self.content_layout.addWidget(self.status_combo)
        
        self.date_label = QLabel("日期")
        self.date_label.setObjectName("detailLabel")
        self.content_layout.addWidget(self.date_label)
        
        date_layout = QHBoxLayout()
        date_layout.setSpacing(12)
        
        self.start_date = QDateEdit()
        self.start_date.setCalendarPopup(True)
        self.start_date.setObjectName("detailInput")
        self.start_date.setFixedHeight(44)
        self.start_date.dateChanged.connect(self.on_change)
        
        self.end_date = QDateEdit()
        self.end_date.setCalendarPopup(True)
        self.end_date.setObjectName("detailInput")
        self.end_date.setFixedHeight(44)
        self.end_date.dateChanged.connect(self.on_change)
        
        date_layout.addWidget(QLabel("开始:"))
        date_layout.addWidget(self.start_date)
        date_layout.addWidget(QLabel("截止:"))
        date_layout.addWidget(self.end_date)
        
        self.content_layout.addLayout(date_layout)
        
        self.desc_label = QLabel("描述")
        self.desc_label.setObjectName("detailLabel")
        self.content_layout.addWidget(self.desc_label)
        
        self.description_editor = QTextEdit()
        self.description_editor.setPlaceholderText("添加描述...")
        self.description_editor.setObjectName("detailEditor")
        self.description_editor.setMinimumHeight(150)
        self.description_editor.textChanged.connect(self.on_change)
        self.content_layout.addWidget(self.description_editor)
        
        self.content_layout.addStretch()
        
        scroll_area.setWidget(content)
        layout.addWidget(scroll_area, 1)
        
        footer = self.create_footer()
        layout.addWidget(footer)
    
    def create_header(self):
        header = QFrame()
        header.setObjectName("detailHeader")
        header.setFixedHeight(64)
        
        layout = QHBoxLayout(header)
        layout.setContentsMargins(20, 16, 20, 16)
        
        title_label = QLabel("任务详情")
        title_label.setStyleSheet(f"color: {NEUTRAL_120}; font-size: 18px; font-weight: 600;")
        layout.addWidget(title_label)
        
        layout.addStretch()
        
        self.close_btn = QPushButton("✕")
        self.close_btn.setObjectName("navBtn")
        self.close_btn.setFixedSize(36, 36)
        self.close_btn.clicked.connect(self.request_close)
        layout.addWidget(self.close_btn)
        
        return header
    
    def create_footer(self):
        footer = QFrame()
        footer.setObjectName("detailFooter")
        footer.setFixedHeight(76)
        
        layout = QVBoxLayout(footer)
        layout.setContentsMargins(20, 16, 20, 16)
        
        btn_layout = QHBoxLayout()
        btn_layout.addStretch()
        
        self.delete_btn = QPushButton("删除")
        self.delete_btn.setObjectName("detailBtnDanger")
        self.delete_btn.setFixedHeight(40)
        self.delete_btn.clicked.connect(self.delete_task)
        btn_layout.addWidget(self.delete_btn)
        
        self.cancel_btn = QPushButton("取消")
        self.cancel_btn.setObjectName("detailBtnSecondary")
        self.cancel_btn.setFixedHeight(40)
        self.cancel_btn.clicked.connect(self.request_close)
        btn_layout.addWidget(self.cancel_btn)
        
        self.save_btn = QPushButton("保存")
        self.save_btn.setObjectName("detailBtn")
        self.save_btn.setFixedHeight(40)
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
        index = self.status_combo.findText(status_text)
        if index >= 0:
            self.status_combo.setCurrentIndex(index)
        
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
                self.main_window.close_task_detail()
            else:
                return
        else:
            self.main_window.close_task_detail()
    
    def save_task(self):
        if self.task:
            self.task.title = self.title_input.text().strip()
            self.task.description = self.description_editor.toPlainText()
            self.task.start_date = self.start_date.date().toString("yyyy-MM-dd")
            self.task.end_date = self.end_date.date().toString("yyyy-MM-dd")
            
            status_map = {"待处理": "todo", "进行中": "in_progress", "已完成": "done"}
            self.task.status = status_map[self.status_combo.currentText()]
            
            self.task.save()
            self.has_unsaved_changes = False
            
            self.main_window.task_list_view.load_tasks()
            self.main_window.close_task_detail()
    
    def delete_task(self):
        if self.task:
            reply = QMessageBox.warning(
                self,
                "确认删除",
                "确定要删除此任务吗？此操作不可恢复。",
                QMessageBox.StandardButton.Yes | 
                QMessageBox.StandardButton.No
            )
            
            if reply == QMessageBox.StandardButton.Yes:
                self.task.delete()
                self.has_unsaved_changes = False
                self.main_window.task_list_view.load_tasks()
                self.main_window.close_task_detail()
