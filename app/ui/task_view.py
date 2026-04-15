from PyQt6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QFrame,
    QPushButton, QScrollArea, QDialog, QLineEdit, 
    QComboBox, QMessageBox, QMenu
)
from PyQt6.QtCore import Qt, pyqtSignal
from PyQt6.QtGui import QFont

from app.core.models import Project, Task


class TaskListView(QScrollArea):
    def __init__(self, main_window):
        super().__init__()
        self.main_window = main_window
        self.setWidgetResizable(True)
        self.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.setStyleSheet("""
            QScrollArea {
                border: none;
                background-color: #f5f5f5;
            }
        """)
        
        self.container = QWidget()
        self.layout = QVBoxLayout(self.container)
        self.layout.setAlignment(Qt.AlignmentFlag.AlignTop)
        self.layout.setSpacing(0)
        self.layout.setContentsMargins(0, 0, 0, 0)
        self.setWidget(self.container)
        
        self.load_tasks()
    
    def load_tasks(self):
        while self.layout.count():
            item = self.layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        
        header = TaskListHeader()
        self.layout.addWidget(header)
        
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
                task_item = TaskItem(task, self.main_window)
                self.layout.addWidget(task_item)
        
        self.layout.addStretch()
    
    def create_task(self):
        dialog = CreateTaskDialog(self.main_window)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            self.load_tasks()


class TaskListHeader(QFrame):
    def __init__(self):
        super().__init__()
        self.setFixedHeight(40)
        self.setStyleSheet("""
            QFrame {
                background-color: #e9ecef;
                border-bottom: 1px solid #ddd;
            }
            QLabel {
                color: #666;
                font-size: 13px;
                font-weight: bold;
            }
        """)
        
        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 8, 16, 8)
        
        name_label = QLabel("名称")
        name_label.setFixedWidth(300)
        
        status_label = QLabel("状态")
        status_label.setFixedWidth(100)
        
        time_label = QLabel("时间")
        time_label.setFixedWidth(200)
        
        tag_label = QLabel("标签")
        tag_label.setFixedWidth(150)
        
        layout.addWidget(name_label)
        layout.addWidget(status_label)
        layout.addWidget(time_label)
        layout.addWidget(tag_label)
        layout.addStretch()


class ProjectHeader(QFrame):
    def __init__(self, project):
        super().__init__()
        self.project = project
        self.setFixedHeight(40)
        self.setStyleSheet(f"""
            QFrame {{
                background-color: #f0f0f0;
                border-bottom: 1px solid #ddd;
                font-weight: bold;
            }}
            QLabel {{
                color: #333;
                font-size: 15px;
            }}
        """)
        
        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 8, 16, 8)
        
        self.icon_label = QLabel("▼")
        self.icon_label.setFixedWidth(20)
        
        color_dot = QLabel("●")
        color_dot.setStyleSheet(f"color: {project.color}; font-size: 16px;")
        color_dot.setFixedWidth(20)
        
        name_label = QLabel(project.name)
        name_label.setFont(QFont("Arial", 14, QFont.Weight.Bold))
        
        layout.addWidget(self.icon_label)
        layout.addWidget(color_dot)
        layout.addWidget(name_label)
        layout.addStretch()


class TaskItem(QFrame):
    def __init__(self, task, main_window):
        super().__init__()
        self.task = task
        self.main_window = main_window
        self.setFrameStyle(QFrame.Shape.NoFrame)
        
        self.setStyleSheet("""
            QFrame {
                background-color: white;
                border-bottom: 1px solid #eee;
            }
            QFrame:hover {
                background-color: #f8f9fa;
            }
            QLabel {
                color: #333;
                font-size: 14px;
            }
        """)
        
        self.setup_ui()
        self.update_height()
    
    def setup_ui(self):
        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 12, 16, 12)
        
        indent = QLabel("")
        indent.setFixedWidth(20)
        layout.addWidget(indent)
        
        if self.task.has_subtasks():
            self.expand_icon = QLabel("▼")
            self.expand_icon.setFixedWidth(20)
            self.expand_icon.mousePressEvent = self.toggle_expand
        else:
            self.expand_icon = QLabel("")
            self.expand_icon.setFixedWidth(20)
        layout.addWidget(self.expand_icon)
        
        name_label = QLabel(self.task.title)
        name_label.setFixedWidth(260)
        name_label.mousePressEvent = self.on_clicked
        layout.addWidget(name_label)
        
        status_map = {
            "todo": ("待开始", "#808080"),
            "in_progress": ("进行中", "#4A90D9"),
            "done": ("已完成", "#28a745")
        }
        status_text, status_color = status_map.get(self.task.status, ("待开始", "#808080"))
        
        status_label = QLabel(f"● {status_text}")
        status_label.setStyleSheet(f"color: {status_color};")
        status_label.setFixedWidth(100)
        layout.addWidget(status_label)
        
        time_text = f"{self.task.start_date or '-'} ~ {self.task.end_date or '-'}"
        time_label = QLabel(time_text)
        time_label.setFixedWidth(200)
        layout.addWidget(time_label)
        
        tags_text = ", ".join([t["name"] for t in self.task.tags[:2]])
        tag_label = QLabel(tags_text)
        tag_label.setFixedWidth(150)
        layout.addWidget(tag_label)
        
        layout.addStretch()
        
        self.subtask_container = QWidget()
        self.subtask_layout = QVBoxLayout(self.subtask_container)
        self.subtask_layout.setContentsMargins(0, 0, 0, 0)
        self.subtask_layout.setSpacing(0)
        
        if self.task.is_expanded:
            self.subtask_container.setVisible(True)
            self.load_subtasks()
        else:
            self.subtask_container.setVisible(False)
        
        main_layout = QVBoxLayout()
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        main_layout.addWidget(self)
        main_layout.addWidget(self.subtask_container)
    
    def load_subtasks(self):
        while self.subtask_layout.count():
            item = self.subtask_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        
        subtasks = self.task.get_subtasks()
        for subtask in subtasks:
            sub_item = SubtaskItem(subtask, self.main_window)
            self.subtask_layout.addWidget(sub_item)
    
    def update_height(self):
        if self.task.is_expanded and self.task.has_subtasks():
            subtasks = self.task.get_subtasks()
            base_height = 44
            subtask_height = len(subtasks) * 40
            self.setFixedHeight(base_height + subtask_height)
        else:
            self.setFixedHeight(44)
    
    def toggle_expand(self, event):
        self.task.is_expanded = not self.task.is_expanded
        
        if self.task.is_expanded:
            self.expand_icon.setText("▼")
            self.subtask_container.setVisible(True)
            self.load_subtasks()
        else:
            self.expand_icon.setText("▸")
            self.subtask_container.setVisible(False)
        
        self.update_height()
    
    def on_clicked(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.main_window.show_task_detail(self.task)


class SubtaskItem(QFrame):
    def __init__(self, task, main_window):
        super().__init__()
        self.task = task
        self.main_window = main_window
        self.setFixedHeight(40)
        self.setFrameStyle(QFrame.Shape.NoFrame)
        
        self.setStyleSheet("""
            QFrame {
                background-color: #fafafa;
                border-bottom: 1px solid #eee;
            }
            QFrame:hover {
                background-color: #f0f0f0;
            }
            QLabel {
                color: #555;
                font-size: 13px;
            }
        """)
        
        self.setup_ui()
    
    def setup_ui(self):
        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 8, 16, 8)
        
        indent = QLabel("")
        indent.setFixedWidth(40)
        layout.addWidget(indent)
        
        icon = QLabel("●")
        icon.setFixedWidth(20)
        layout.addWidget(icon)
        
        name_label = QLabel(self.task.title)
        name_label.setFixedWidth(240)
        name_label.mousePressEvent = self.on_clicked
        layout.addWidget(name_label)
        
        status_map = {
            "todo": ("待开始", "#808080"),
            "in_progress": ("进行中", "#4A90D9"),
            "done": ("已完成", "#28a745")
        }
        status_text, status_color = status_map.get(self.task.status, ("待开始", "#808080"))
        
        status_label = f"● {status_text}"
        status_label_widget = QLabel(status_label)
        status_label_widget.setStyleSheet(f"color: {status_color};")
        status_label_widget.setFixedWidth(100)
        layout.addWidget(status_label_widget)
        
        time_text = f"{self.task.start_date or '-'} ~ {self.task.end_date or '-'}"
        time_label = QLabel(time_text)
        time_label.setFixedWidth(200)
        layout.addWidget(time_label)
        
        layout.addStretch()
    
    def on_clicked(self, event):
        if event.button() == Qt.MouseButton.LeftButton:
            self.main_window.show_task_detail(self.task)


class CreateTaskDialog(QDialog):
    def __init__(self, main_window):
        super().__init__(main_window)
        self.setWindowTitle("新建任务")
        self.setModal(True)
        self.setMinimumWidth(400)
        
        self.setup_ui()
    
    def setup_ui(self):
        layout = QVBoxLayout(self)
        
        self.title_input = QLineEdit()
        self.title_input.setPlaceholderText("任务标题")
        layout.addWidget(self.title_input)
        
        self.project_combo = QComboBox()
        projects = Project.get_all()
        for project in projects:
            self.project_combo.addItem(project.name, project.id)
        layout.addWidget(self.project_combo)
        
        self.status_combo = QComboBox()
        self.status_combo.addItems(["待开始", "进行中", "已完成"])
        layout.addWidget(self.status_combo)
        
        save_btn = QPushButton("保存")
        save_btn.clicked.connect(self.save)
        layout.addWidget(save_btn)
    
    def save(self):
        title = self.title_input.text().strip()
        if not title:
            QMessageBox.warning(self, "提示", "请输入任务标题")
            return
        
        project_id = self.project_combo.currentData()
        status_map = {"待开始": "todo", "进行中": "in_progress", "已完成": "done"}
        status = status_map[self.status_combo.currentText()]
        
        task = Task(title=title, project_id=project_id, status=status)
        task.save()
        
        self.accept()
