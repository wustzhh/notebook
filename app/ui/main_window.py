from PyQt6.QtWidgets import (
    QMainWindow, QWidget, QVBoxLayout, QHBoxLayout, 
    QPushButton, QLineEdit, QLabel, QFrame, QScrollArea,
    QSplitter, QSizePolicy, QStackedWidget
)
from PyQt6.QtCore import Qt, QPropertyAnimation, QPoint, pyqtSignal
from PyQt6.QtGui import QFont, QIcon

from .styles import *
from .sidebar import SideBar
from .task_view import TaskListView
from .task_detail import TaskDetailPanel
from .create_issue_dialog import CreateIssueDialog


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Jira - 个人记事本")
        self.setMinimumSize(1400, 900)
        self.setStyleSheet(get_main_stylesheet())
        
        self.current_project_id = None
        self.setup_ui()
        
    def setup_ui(self):
        central_widget = QWidget()
        central_widget.setObjectName("contentArea")
        self.setCentralWidget(central_widget)
        
        main_layout = QVBoxLayout(central_widget)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)
        
        self.top_nav = self.create_top_navigation()
        main_layout.addWidget(self.top_nav)
        
        content_container = QHBoxLayout()
        content_container.setContentsMargins(0, 0, 0, 0)
        content_container.setSpacing(0)
        
        self.sidebar = SideBar(self)
        content_container.addWidget(self.sidebar)
        
        self.main_content = QWidget()
        self.main_content.setObjectName("contentArea")
        main_content_layout = QVBoxLayout(self.main_content)
        main_content_layout.setContentsMargins(0, 0, 0, 0)
        main_content_layout.setSpacing(0)
        
        self.page_header = self.create_page_header()
        main_content_layout.addWidget(self.page_header)
        
        self.task_list_view = TaskListView(self)
        main_content_layout.addWidget(self.task_list_view)
        
        content_container.addWidget(self.main_content, 1)
        
        self.detail_panel = TaskDetailPanel(self)
        content_container.addWidget(self.detail_panel)
        
        main_layout.addLayout(content_container)
    
    def create_top_navigation(self):
        top_nav = QFrame()
        top_nav.setObjectName("topNav")
        top_nav.setFixedHeight(HEADER_HEIGHT)
        
        layout = QHBoxLayout(top_nav)
        layout.setContentsMargins(0, 0, 0, 0)
        
        left_section = QHBoxLayout()
        
        menu_btn = QPushButton("☰")
        menu_btn.setObjectName("navBtn")
        menu_btn.setFixedSize(40, HEADER_HEIGHT)
        menu_btn.clicked.connect(self.toggle_sidebar)
        left_section.addWidget(menu_btn)
        
        logo_btn = QPushButton("Jira")
        logo_btn.setObjectName("logoBtn")
        left_section.addWidget(logo_btn)
        
        left_section.addSpacing(24)
        
        nav_items = ["仪表盘", "项目", "筛选器", "人员"]
        for item in nav_items:
            btn = QPushButton(item)
            btn.setObjectName("navBtn")
            left_section.addWidget(btn)
        
        layout.addLayout(left_section)
        layout.addStretch()
        
        center_section = QHBoxLayout()
        self.search_input = QLineEdit()
        self.search_input.setObjectName("searchInput")
        self.search_input.setPlaceholderText("搜索...")
        self.search_input.setFixedWidth(300)
        self.search_input.setFixedHeight(36)
        center_section.addWidget(self.search_input)
        
        layout.addLayout(center_section)
        layout.addSpacing(16)
        
        right_section = QHBoxLayout()
        
        create_btn = QPushButton("+ 创建")
        create_btn.setObjectName("createBtn")
        create_btn.setFixedHeight(36)
        create_btn.clicked.connect(self.show_create_dialog)
        right_section.addWidget(create_btn)
        
        help_btn = QPushButton("?")
        help_btn.setObjectName("navBtn")
        help_btn.setFixedSize(36, 36)
        right_section.addWidget(help_btn)
        
        avatar_btn = QPushButton("👤")
        avatar_btn.setObjectName("navBtn")
        avatar_btn.setFixedSize(36, 36)
        right_section.addWidget(avatar_btn)
        
        layout.addLayout(right_section)
        
        return top_nav
    
    def create_page_header(self):
        page_header = QFrame()
        page_header.setObjectName("pageHeader")
        page_header.setFixedHeight(80)
        
        layout = QHBoxLayout(page_header)
        layout.setContentsMargins(24, 16, 24, 16)
        
        left_section = QVBoxLayout()
        
        breadcrumb = QLabel("项目 / 默认项目")
        breadcrumb.setStyleSheet(f"color: {NEUTRAL_70}; font-size: 14px;")
        left_section.addWidget(breadcrumb)
        
        title = QLabel("任务列表")
        title.setObjectName("pageTitle")
        left_section.addWidget(title)
        
        layout.addLayout(left_section)
        layout.addStretch()
        
        right_section = QHBoxLayout()
        
        filter_btn = QPushButton("筛选")
        filter_btn.setObjectName("detailBtnSecondary")
        filter_btn.setFixedHeight(36)
        right_section.addWidget(filter_btn)
        
        view_btn = QPushButton("视图 ▾")
        view_btn.setObjectName("detailBtnSecondary")
        view_btn.setFixedHeight(36)
        right_section.addWidget(view_btn)
        
        layout.addLayout(right_section)
        
        return page_header
    
    def toggle_sidebar(self):
        self.sidebar.toggle()
    
    def show_create_dialog(self):
        dialog = CreateIssueDialog(self)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            task_data = dialog.get_task_data()
            self.task_list_view.create_task(task_data)
    
    def show_task_detail(self, task):
        self.detail_panel.load_task(task)
        self.detail_panel.slide_in()
    
    def close_task_detail(self):
        self.detail_panel.slide_out()
    
    def set_current_project(self, project_id):
        self.current_project_id = project_id
        self.task_list_view.load_tasks(project_id)
