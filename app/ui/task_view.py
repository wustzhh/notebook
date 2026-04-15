from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QFrame,
    QPushButton, QScrollArea, QDialog, QLineEdit, 
    QComboBox, QMessageBox, QDateEdit, QFormLayout,
    QTextEdit
)
from PyQt6.QtCore import Qt, QDate
from PyQt6.QtGui import QCursor

from .styles import *
from app.core.models import Project, Task, Tag


class TaskListView(QScrollArea):
    def __init__(self, main_window):
        super().__init__()
        self.main_window = main_window
        self.setWidgetResizable(True)
        self.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.setStyleSheet(f"""
            QScrollArea {{
                border: none;
                background-color: {NEUTRAL_10};
            }}
        """)
        
        self.container = QWidget()
        self.layout = QVBoxLayout(self.container)
        self.layout.setAlignment(Qt.AlignmentFlag.AlignTop)
        self.layout.setSpacing(0)
        self.layout.setContentsMargins(24, 20, 24, 20)
        self.setWidget(self.container)
        
        self.current_project_id = None
        self.load_tasks()
    
    def load_tasks(self, project_id=None):
        if project_id:
            self.current_project_id = project_id
        
        while self.layout.count():
            item = self.layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        
        header = TaskListHeader()
        self.layout.addWidget(header)
        
        if self.current_project_id:
            projects = [Project.get_by_id(self.current_project_id)]
        else:
            projects = Project.get_all()
        
        if not projects:
            default_project = Project(name="默认项目")
            default_project.save()
            projects = [default_project]
        
        for project in projects:
            project_header = ProjectHeader(project)
            self.layout.addWidget(project_header)
            
            tasks = Task.get_by_project(project.id)
            for task in tasks:
                task_item = TaskRow(task, self.main_window)
                self.layout.addWidget(task_item)
                
                if task.is_expanded and task.has_subtasks():
                    subtasks = task.get_subtasks()
                    for subtask in subtasks:
                        subtask_item = SubtaskRow(subtask, self.main_window)
                        self.layout.addWidget(subtask_item)
        
        self.layout.addStretch()
    
    def create_task(self, task_data):
        task = Task(
            title=task_data['title'],
            description=task_data.get('description', ''),
            project_id=task_data['project_id'],
            status=task_data.get('status', 'todo'),
            start_date=task_data.get('start_date'),
            end_date=task_data.get('end_date')
        )
        task.save()
        self.load_tasks()


class TaskListHeader(QFrame):
    def __init__(self):
        super().__init__()
        self.setObjectName("taskListHeader")
        self.setFixedHeight(ROW_HEIGHT_COMPACT)
        
        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 0, 16, 0)
        
        type_label = QLabel("类型")
        type_label.setObjectName("taskListHeaderLabel")
        type_label.setFixedWidth(60)
        layout.addWidget(type_label)
        
        key_label = QLabel("问题")
        key_label.setObjectName("taskListHeaderLabel")
        key_label.setFixedWidth(90)
        layout.addWidget(key_label)
        
        summary_label = QLabel("摘要")
        summary_label.setObjectName("taskListHeaderLabel")
        summary_label.setFixedWidth(400)
        layout.addWidget(summary_label)
        
        status_label = QLabel("状态")
        status_label.setObjectName("taskListHeaderLabel")
        status_label.setFixedWidth(100)
        layout.addWidget(status_label)
        
        due_date_label = QLabel("截止日期")
        due_date_label.setObjectName("taskListHeaderLabel")
        due_date_label.setFixedWidth(100)
        layout.addWidget(due_date_label)
        
        layout.addStretch()


class ProjectHeader(QFrame):
    def __init__(self, project):
        super().__init__()
        self.project = project
        self.setObjectName("projectHeader")
        self.setFixedHeight(44)
        
        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 0, 16, 0)
        
        icon_label = QLabel("📁")
        icon_label.setFixedWidth(24)
        layout.addWidget(icon_label)
        
        name_label = QLabel(project.name)
        name_label.setStyleSheet(f"""
            color: {NEUTRAL_120};
            font-size: 14px;
            font-weight: 600;
        """)
        layout.addWidget(name_label)
        
        layout.addStretch()


class TaskRow(QFrame):
    def __init__(self, task, main_window):
        super().__init__()
        self.task = task
        self.main_window = main_window
        self.setObjectName("taskRow")
        self.setFixedHeight(ROW_HEIGHT)
        
        self.setup_ui()
    
    def setup_ui(self):
        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 0, 16, 0)
        
        type_icon = QLabel("📋")
        type_icon.setFixedWidth(60)
        type_icon.setStyleSheet("font-size: 18px;")
        layout.addWidget(type_icon)
        
        key_label = QLabel(f"TASK-{self.task.id}")
        key_label.setObjectName("taskKey")
        key_label.setFixedWidth(90)
        layout.addWidget(key_label)
        
        summary_label = QLabel(self.task.title)
        summary_label.setObjectName("taskSummary")
        summary_label.setFixedWidth(400)
        layout.addWidget(summary_label)
        
        status_widget = self.create_status_widget(self.task.status)
        status_widget.setFixedWidth(100)
        layout.addWidget(status_widget)
        
        due_date = self.task.end_date or "-"
        due_date_label = QLabel(str(due_date))
        due_date_label.setStyleSheet(f"color: {NEUTRAL_80}; font-size: 13px;")
        due_date_label.setFixedWidth(100)
        layout.addWidget(due_date_label)
        
        layout.addStretch()
        
        self.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
    
    def create_status_widget(self, status):
        status_map = {
            "todo": ("待处理", NEUTRAL_20, NEUTRAL_100, "statusTodo"),
            "in_progress": ("进行中", INFO_LIGHT, PRIMARY, "statusInProgress"),
            "done": ("已完成", SUCCESS_LIGHT, SUCCESS, "statusDone")
        }
        
        text, bg_color, text_color, obj_name = status_map.get(status, status_map["todo"])
        
        widget = QFrame()
        widget.setObjectName(obj_name)
        widget.setStyleSheet(f"""
            QFrame {{
                background-color: {bg_color};
                border-radius: 3px;
            }}
        """)
        
        inner_layout = QHBoxLayout(widget)
        inner_layout.setContentsMargins(8, 4, 8, 4)
        
        label = QLabel(text)
        label.setStyleSheet(f"""
            color: {text_color};
            font-size: 12px;
            font-weight: 600;
        """)
        inner_layout.addWidget(label)
        inner_layout.addStretch()
        
        return widget
    
    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.main_window.show_task_detail(self.task)
        super().mousePressEvent(event)


class SubtaskRow(QFrame):
    def __init__(self, task, main_window):
        super().__init__()
        self.task = task
        self.main_window = main_window
        self.setFixedHeight(ROW_HEIGHT_COMPACT)
        self.setStyleSheet(f"""
            QFrame {{
                background-color: {NEUTRAL_10};
                border-bottom: 1px solid {NEUTRAL_30};
            }}
            QFrame:hover {{
                background-color: {NEUTRAL_20};
            }}
        """)
        
        self.setup_ui()
    
    def setup_ui(self):
        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 0, 16, 0)
        
        indent = QLabel("")
        indent.setFixedWidth(24)
        layout.addWidget(indent)
        
        type_icon = QLabel("•")
        type_icon.setStyleSheet(f"color: {NEUTRAL_60}; font-size: 20px;")
        type_icon.setFixedWidth(36)
        layout.addWidget(type_icon)
        
        key_label = QLabel(f"TASK-{self.task.id}")
        key_label.setStyleSheet(f"color: {NEUTRAL_70}; font-size: 13px;")
        key_label.setFixedWidth(90)
        layout.addWidget(key_label)
        
        summary_label = QLabel(self.task.title)
        summary_label.setStyleSheet(f"color: {NEUTRAL_100}; font-size: 13px;")
        summary_label.setFixedWidth(400)
        layout.addWidget(summary_label)
        
        status_widget = self.create_status_widget(self.task.status)
        status_widget.setFixedWidth(100)
        layout.addWidget(status_widget)
        
        layout.addStretch()
        
        self.setCursor(QCursor(Qt.CursorShape.PointingHandCursor))
    
    def create_status_widget(self, status):
        status_map = {
            "todo": ("待处理", NEUTRAL_20, NEUTRAL_100),
            "in_progress": ("进行中", INFO_LIGHT, PRIMARY),
            "done": ("已完成", SUCCESS_LIGHT, SUCCESS)
        }
        
        text, bg_color, text_color = status_map.get(status, status_map["todo"])
        
        widget = QFrame()
        widget.setStyleSheet(f"""
            QFrame {{
                background-color: {bg_color};
                border-radius: 3px;
            }}
        """)
        
        inner_layout = QHBoxLayout(widget)
        inner_layout.setContentsMargins(6, 2, 6, 2)
        
        label = QLabel(text)
        label.setStyleSheet(f"""
            color: {text_color};
            font-size: 11px;
        """)
        inner_layout.addWidget(label)
        inner_layout.addStretch()
        
        return widget
    
    def mousePressEvent(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.main_window.show_task_detail(self.task)
        super().mousePressEvent(event)


class CreateIssueDialog(QDialog):
    def __init__(self, main_window):
        super().__init__(main_window)
        self.setWindowTitle("创建任务")
        self.setModal(True)
        self.setMinimumWidth(500)
        self.setMinimumHeight(550)
        self.setStyleSheet(get_main_stylesheet())
        
        self.setup_ui()
    
    def setup_ui(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(20)
        
        title_label = QLabel("创建任务")
        title_label.setObjectName("dialogTitle")
        layout.addWidget(title_label)
        
        form_container = QWidget()
        form_layout = QFormLayout(form_container)
        form_layout.setSpacing(16)
        form_layout.setFieldGrowthPolicy(QFormLayout.FieldGrowthPolicy.AllNonFixedFieldsGrow)
        
        self.project_combo = QComboBox()
        projects = Project.get_all()
        for project in projects:
            self.project_combo.addItem(project.name, project.id)
        form_layout.addRow("项目", self.project_combo)
        
        self.summary_input = QLineEdit()
        self.summary_input.setPlaceholderText("任务摘要")
        self.summary_input.setObjectName("detailInput")
        self.summary_input.setFixedHeight(40)
        form_layout.addRow("摘要", self.summary_input)
        
        self.status_combo = QComboBox()
        self.status_combo.addItems(["待处理", "进行中", "已完成"])
        self.status_combo.setObjectName("detailInput")
        self.status_combo.setFixedHeight(40)
        form_layout.addRow("状态", self.status_combo)
        
        date_layout = QHBoxLayout()
        self.start_date = QDateEdit()
        self.start_date.setCalendarPopup(True)
        self.start_date.setObjectName("detailInput")
        self.start_date.setFixedHeight(40)
        self.start_date.setDate(QDate.currentDate())
        self.end_date = QDateEdit()
        self.end_date.setCalendarPopup(True)
        self.end_date.setObjectName("detailInput")
        self.end_date.setFixedHeight(40)
        self.end_date.setDate(QDate.currentDate().addDays(7))
        date_layout.addWidget(QLabel("从"))
        date_layout.addWidget(self.start_date)
        date_layout.addWidget(QLabel("到"))
        date_layout.addWidget(self.end_date)
        form_layout.addRow("日期", date_layout)
        
        self.description_editor = QTextEdit()
        self.description_editor.setPlaceholderText("任务描述...")
        self.description_editor.setObjectName("detailEditor")
        self.description_editor.setMinimumHeight(100)
        form_layout.addRow("描述", self.description_editor)
        
        layout.addWidget(form_container)
        
        btn_layout = QHBoxLayout()
        btn_layout.addStretch()
        
        cancel_btn = QPushButton("取消")
        cancel_btn.setObjectName("detailBtnSecondary")
        cancel_btn.setFixedHeight(40)
        cancel_btn.clicked.connect(self.reject)
        
        create_btn = QPushButton("创建")
        create_btn.setObjectName("detailBtn")
        create_btn.setFixedHeight(40)
        create_btn.clicked.connect(self.create)
        
        btn_layout.addWidget(cancel_btn)
        btn_layout.addWidget(create_btn)
        layout.addLayout(btn_layout)
    
    def create(self):
        summary = self.summary_input.text().strip()
        if not summary:
            QMessageBox.warning(self, "提示", "请输入摘要")
            return
        
        self.accept()
    
    def get_task_data(self):
        status_map = {"待处理": "todo", "进行中": "in_progress", "已完成": "done"}
        
        return {
            'title': self.summary_input.text().strip(),
            'description': self.description_editor.toPlainText(),
            'project_id': self.project_combo.currentData(),
            'status': status_map[self.status_combo.currentText()],
            'start_date': self.start_date.date().toString("yyyy-MM-dd"),
            'end_date': self.end_date.date().toString("yyyy-MM-dd"),
        }
