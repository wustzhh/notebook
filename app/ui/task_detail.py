from PyQt6.QtWidgets import (
    QFrame, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QTextEdit, QComboBox, QPushButton, QDateEdit, QMessageBox,
    QFormLayout, QScrollArea, QWidget
)
from PyQt6.QtCore import Qt, QPropertyAnimation, QPoint, QDate
from PyQt6.QtGui import QFont


class TaskDetailPanel(QFrame):
    def __init__(self, main_window):
        super().__init__()
        self.main_window = main_window
        self.task = None
        self.has_unsaved_changes = False
        self.is_visible = False
        
        self.setFixedWidth(480)
        self.setStyleSheet("""
            QFrame {
                background-color: white;
                border-left: 1px solid #ddd;
            }
            QLabel {
                color: #333;
            }
            QLineEdit, QTextEdit, QComboBox, QDateEdit {
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
            }
            QLineEdit:focus, QTextEdit:focus, QComboBox:focus, QDateEdit:focus {
                border-color: #4A90D9;
            }
            QPushButton {
                background-color: #4A90D9;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                font-size: 14px;
            }
            QPushButton:hover {
                background-color: #357ABD;
            }
            QPushButton#cancelBtn {
                background-color: #f0f0f0;
                color: #333;
            }
            QPushButton#cancelBtn:hover {
                background-color: #e0e0e0;
            }
        """)
        
        self.setup_ui()
    
    def setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 20, 24, 20)
        layout.setSpacing(16)
        
        header_layout = QHBoxLayout()
        
        title_label = QLabel("任务详情")
        title_label.setFont(QFont("Arial", 18, QFont.Weight.Bold))
        
        self.close_btn = QPushButton("✕")
        self.close_btn.setFixedSize(32, 32)
        self.close_btn.setStyleSheet("""
            QPushButton {
                background-color: transparent;
                color: #666;
                font-size: 18px;
            }
            QPushButton:hover {
                background-color: #f0f0f0;
            }
        """)
        self.close_btn.clicked.connect(self.request_close)
        
        header_layout.addWidget(title_label)
        header_layout.addStretch()
        header_layout.addWidget(self.close_btn)
        
        layout.addLayout(header_layout)
        
        scroll_area = QScrollArea()
        scroll_area.setWidgetResizable(True)
        scroll_area.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        scroll_area.setStyleSheet("QScrollArea { border: none; background-color: transparent; }")
        
        form_container = QWidget()
        self.form_layout = QFormLayout(form_container)
        self.form_layout.setSpacing(16)
        self.form_layout.setFieldGrowthPolicy(QFormLayout.FieldGrowthPolicy.AllNonFixedFieldsGrow)
        
        self.title_input = QLineEdit()
        self.title_input.setPlaceholderText("任务标题")
        self.title_input.textChanged.connect(self.on_change)
        self.form_layout.addRow("标题", self.title_input)
        
        self.status_combo = QComboBox()
        self.status_combo.addItems(["待开始", "进行中", "已完成"])
        self.status_combo.currentTextChanged.connect(self.on_change)
        self.form_layout.addRow("状态", self.status_combo)
        
        date_layout = QHBoxLayout()
        self.start_date = QDateEdit()
        self.start_date.setCalendarPopup(True)
        self.start_date.dateChanged.connect(self.on_change)
        self.end_date = QDateEdit()
        self.end_date.setCalendarPopup(True)
        self.end_date.dateChanged.connect(self.on_change)
        date_layout.addWidget(QLabel("从"))
        date_layout.addWidget(self.start_date)
        date_layout.addWidget(QLabel("到"))
        date_layout.addWidget(self.end_date)
        self.form_layout.addRow("时间", date_layout)
        
        self.description_editor = QTextEdit()
        self.description_editor.setPlaceholderText("任务描述...")
        self.description_editor.setMinimumHeight(150)
        self.description_editor.textChanged.connect(self.on_change)
        self.form_layout.addRow("描述", self.description_editor)
        
        scroll_area.setWidget(form_container)
        layout.addWidget(scroll_area, 1)
        
        btn_layout = QHBoxLayout()
        btn_layout.addStretch()
        
        self.cancel_btn = QPushButton("取消")
        self.cancel_btn.setObjectName("cancelBtn")
        self.cancel_btn.clicked.connect(self.request_close)
        
        self.save_btn = QPushButton("保存")
        self.save_btn.clicked.connect(self.save_task)
        
        btn_layout.addWidget(self.cancel_btn)
        btn_layout.addWidget(self.save_btn)
        
        layout.addLayout(btn_layout)
    
    def load_task(self, task):
        self.task = task
        self.has_unsaved_changes = False
        
        self.title_input.setText(task.title)
        
        status_map = {"todo": "待开始", "in_progress": "进行中", "done": "已完成"}
        status_text = status_map.get(task.status, "待开始")
        index = self.status_combo.findText(status_text)
        if index >= 0:
            self.status_combo.setCurrentIndex(index)
        
        if task.start_date:
            self.start_date.setDate(QDate.fromString(str(task.start_date), "yyyy-MM-dd"))
        else:
            self.start_date.setDate(QDate.currentDate())
        
        if task.end_date:
            self.end_date.setDate(QDate.fromString(str(task.end_date), "yyyy-MM-dd"))
        else:
            self.end_date.setDate(QDate.currentDate().addDays(7))
        
        self.description_editor.setText(task.description or "")
    
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
            
            status_map = {"待开始": "todo", "进行中": "in_progress", "已完成": "done"}
            self.task.status = status_map[self.status_combo.currentText()]
            
            self.task.start_date = self.start_date.date().toString("yyyy-MM-dd")
            self.task.end_date = self.end_date.date().toString("yyyy-MM-dd")
            
            self.task.description = self.description_editor.toPlainText()
            
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
            self.animation.setDuration(300)
            self.animation.setStartValue(QPoint(parent.width(), 0))
            self.animation.setEndValue(QPoint(parent.width() - self.width(), 0))
            self.animation.start()
            
            self.is_visible = True
    
    def slide_out(self):
        parent = self.parent()
        if parent:
            self.animation = QPropertyAnimation(self, b"pos")
            self.animation.setDuration(300)
            self.animation.setStartValue(self.pos())
            self.animation.setEndValue(QPoint(parent.width(), 0))
            self.animation.finished.connect(self.hide)
            self.animation.start()
            
            self.is_visible = False
