from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QPushButton, QLineEdit, QLabel, QFrame, QScrollArea,
    QSplitter, QSizePolicy
)
from PyQt6.QtCore import Qt, QPropertyAnimation, QPoint, pyqtSignal, QSize
from PyQt6.QtGui import QFont

from .task_view import TaskListView
from .task_detail import TaskDetailPanel
from .sidebar import SideBar


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("个人记事本")
        self.setMinimumSize(1200, 800)
        self.setStyleSheet(self.get_styles())
        
        self.setup_ui()
        
    def get_styles(self):
        return """
            QMainWindow {
                background-color: #f5f5f5;
            }
            QPushButton {
                background-color: #4A90D9;
                color: white;
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 14px;
            }
            QPushButton:hover {
                background-color: #357ABD;
            }
            QLineEdit {
                padding: 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-size: 14px;
            }
            QLabel {
                color: #333;
            }
        """
        
    def setup_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        
        self.top_bar = self.create_top_bar()
        self.action_bar = self.create_action_bar()
        
        main_layout.addWidget(self.top_bar)
        main_layout.addWidget(self.action_bar)
        
        content_splitter = QSplitter(Qt.Orientation.Horizontal)
        content_splitter.setHandleWidth(1)
        content_splitter.setStyleSheet("QSplitter::handle { background-color: #ddd; }")
        
        self.sidebar = SideBar()
        self.task_list_view = TaskListView(self)
        self.detail_panel = TaskDetailPanel(self)
        
        content_splitter.addWidget(self.sidebar)
        
        task_list_container = QWidget()
        task_list_layout = QVBoxLayout(task_list_container)
        task_list_layout.setContentsMargins(0, 0, 0, 0)
        task_list_layout.setSpacing(0)
        task_list_layout.addWidget(self.task_list_view)
        
        content_splitter.addWidget(task_list_container)
        
        main_layout.addWidget(content_splitter, 1)
        
        content_splitter.setSizes([250, 950])
        content_splitter.handle(1).setEnabled(False)
        
    def create_top_bar(self):
        top_bar = QFrame()
        top_bar.setFixedHeight(60)
        top_bar.setStyleSheet("""
            QFrame {
                background-color: #2c3e50;
                border-bottom: 1px solid #ddd;
            }
        """)
        
        layout = QHBoxLayout(top_bar)
        layout.setContentsMargins(16, 8, 16, 8)
        
        menu_btn = QPushButton("☰")
        menu_btn.setFixedSize(40, 40)
        menu_btn.setStyleSheet("""
            QPushButton {
                background-color: transparent;
                font-size: 20px;
            }
            QPushButton:hover {
                background-color: rgba(255,255,255,0.1);
            }
        """)
        menu_btn.clicked.connect(self.toggle_sidebar)
        
        title_label = QLabel("个人记事本")
        title_label.setStyleSheet("""
            QLabel {
                color: white;
                font-size: 18px;
                font-weight: bold;
            }
        """)
        
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("🔍 搜索任务...")
        self.search_input.setFixedWidth(300)
        
        user_btn = QPushButton("👤")
        user_btn.setFixedSize(40, 40)
        user_btn.setStyleSheet("""
            QPushButton {
                background-color: transparent;
                font-size: 20px;
            }
            QPushButton:hover {
                background-color: rgba(255,255,255,0.1);
            }
        """)
        
        settings_btn = QPushButton("⚙️")
        settings_btn.setFixedSize(40, 40)
        settings_btn.setStyleSheet("""
            QPushButton {
                background-color: transparent;
                font-size: 18px;
            }
            QPushButton:hover {
                background-color: rgba(255,255,255,0.1);
            }
        """)
        
        layout.addWidget(menu_btn)
        layout.addWidget(title_label)
        layout.addStretch()
        layout.addWidget(self.search_input)
        layout.addStretch()
        layout.addWidget(user_btn)
        layout.addWidget(settings_btn)
        
        return top_bar
    
    def create_action_bar(self):
        action_bar = QFrame()
        action_bar.setFixedHeight(50)
        action_bar.setStyleSheet("""
            QFrame {
                background-color: white;
                border-bottom: 1px solid #ddd;
            }
        """)
        
        layout = QHBoxLayout(action_bar)
        layout.setContentsMargins(16, 8, 16, 8)
        
        new_task_btn = QPushButton("+ 新建任务")
        new_task_btn.clicked.connect(self.create_new_task)
        
        self.project_combo = QPushButton("项目 ▼")
        self.project_combo.setStyleSheet("""
            QPushButton {
                background-color: #f0f0f0;
                color: #333;
            }
            QPushButton:hover {
                background-color: #e0e0e0;
            }
        """)
        
        filter_btn = QPushButton("筛选 ▼")
        filter_btn.setStyleSheet("""
            QPushButton {
                background-color: #f0f0f0;
                color: #333;
            }
            QPushButton:hover {
                background-color: #e0e0e0;
            }
        """)
        
        view_btn = QPushButton("视图 ▼")
        view_btn.setStyleSheet("""
            QPushButton {
                background-color: #f0f0f0;
                color: #333;
            }
            QPushButton:hover {
                background-color: #e0e0e0;
            }
        """)
        
        layout.addWidget(new_task_btn)
        layout.addWidget(self.project_combo)
        layout.addWidget(filter_btn)
        layout.addWidget(view_btn)
        layout.addStretch()
        
        return action_bar
    
    def toggle_sidebar(self):
        self.sidebar.toggle()
    
    def create_new_task(self):
        self.task_list_view.create_task()
    
    def show_task_detail(self, task):
        self.detail_panel.load_task(task)
        self.detail_panel.slide_in()
    
    def close_task_detail(self):
        self.detail_panel.slide_out()
