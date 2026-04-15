"""
Jira 风格配色方案
参考：https://atlassian.design/colors
"""

# 主色调
PRIMARY = "#0052CC"
PRIMARY_DARK = "#0747A6"
PRIMARY_LIGHT = "#DEEBFF"

# 中性色
NEUTRAL_0 = "#FFFFFF"
NEUTRAL_10 = "#FAFBFC"
NEUTRAL_20 = "#F4F5F7"
NEUTRAL_30 = "#EBECF0"
NEUTRAL_40 = "#DFE1E6"
NEUTRAL_50 = "#C1C7D0"
NEUTRAL_60 = "#A5ADBA"
NEUTRAL_70 = "#8993A4"
NEUTRAL_80 = "#6B778C"
NEUTRAL_90 = "#5E6C84"
NEUTRAL_100 = "#42526E"
NEUTRAL_110 = "#253858"
NEUTRAL_120 = "#172B4D"

# 状态色
SUCCESS = "#36B37E"
SUCCESS_LIGHT = "#E3FCEF"
WARNING = "#FFAB00"
WARNING_LIGHT = "#FFFAE6"
ERROR = "#FF5630"
ERROR_LIGHT = "#FFEBE6"
INFO = "#0052CC"
INFO_LIGHT = "#DEEBFF"

# 尺寸
HEADER_HEIGHT = 48
SIDEBAR_WIDTH = 240
SIDEBAR_COLLAPSED_WIDTH = 48
DETAIL_PANEL_WIDTH = 480
ROW_HEIGHT = 48
ROW_HEIGHT_COMPACT = 40


def get_main_stylesheet():
    """主样式表"""
    return f"""
    QMainWindow {{
        background-color: {NEUTRAL_10};
    }}
    
    /* ========== 顶部导航栏 ========== */
    QFrame#topNav {{
        background-color: {NEUTRAL_0};
        border-bottom: 1px solid {NEUTRAL_40};
    }}
    
    QPushButton#navBtn {{
        background-color: transparent;
        border: none;
        padding: 8px 12px;
        border-radius: 3px;
        color: {NEUTRAL_100};
        font-size: 14px;
    }}
    QPushButton#navBtn:hover {{
        background-color: {NEUTRAL_20};
    }}
    
    QPushButton#logoBtn {{
        background-color: transparent;
        border: none;
        padding: 8px 12px;
        color: {PRIMARY};
        font-size: 20px;
        font-weight: bold;
    }}
    
    QLineEdit#searchInput {{
        background-color: {NEUTRAL_20};
        border: 2px solid transparent;
        border-radius: 3px;
        padding: 8px 12px;
        color: {NEUTRAL_120};
        font-size: 14px;
    }}
    QLineEdit#searchInput:focus {{
        background-color: {NEUTRAL_0};
        border-color: {PRIMARY};
    }}
    QLineEdit#searchInput::placeholder {{
        color: {NEUTRAL_70};
    }}
    
    QPushButton#createBtn {{
        background-color: {PRIMARY};
        color: {NEUTRAL_0};
        border: none;
        padding: 8px 16px;
        border-radius: 3px;
        font-size: 14px;
        font-weight: 500;
    }}
    QPushButton#createBtn:hover {{
        background-color: {PRIMARY_DARK};
    }}
    
    /* ========== 左侧边栏 ========== */
    QFrame#sidebar {{
        background-color: {NEUTRAL_0};
        border-right: 1px solid {NEUTRAL_40};
    }}
    
    QPushButton#sidebarItem {{
        background-color: transparent;
        border: none;
        padding: 8px 12px;
        border-radius: 3px;
        color: {NEUTRAL_100};
        font-size: 14px;
        text-align: left;
    }}
    QPushButton#sidebarItem:hover {{
        background-color: {NEUTRAL_20};
    }}
    QPushButton#sidebarItem:checked {{
        background-color: {PRIMARY_LIGHT};
        color: {PRIMARY};
        font-weight: 500;
    }}
    
    QLabel#sidebarHeading {{
        color: {NEUTRAL_80};
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        padding: 16px 12px 8px;
    }}
    
    /* ========== 内容区域 ========== */
    QFrame#contentArea {{
        background-color: {NEUTRAL_10};
    }}
    
    QFrame#pageHeader {{
        background-color: {NEUTRAL_10};
        border-bottom: 1px solid {NEUTRAL_40};
    }}
    
    QLabel#pageTitle {{
        color: {NEUTRAL_120};
        font-size: 24px;
        font-weight: 600;
    }}
    
    QLabel#pageSubtitle {{
        color: {NEUTRAL_80};
        font-size: 14px;
    }}
    
    /* ========== 任务列表 ========== */
    QFrame#taskListHeader {{
        background-color: {NEUTRAL_0};
        border-bottom: 2px solid {NEUTRAL_40};
    }}
    
    QLabel#taskListHeaderLabel {{
        color: {NEUTRAL_80};
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
    }}
    
    QFrame#taskRow {{
        background-color: {NEUTRAL_0};
        border-bottom: 1px solid {NEUTRAL_30};
    }}
    QFrame#taskRow:hover {{
        background-color: {NEUTRAL_20};
    }}
    
    QLabel#taskKey {{
        color: {NEUTRAL_80};
        font-size: 14px;
    }}
    
    QLabel#taskSummary {{
        color: {NEUTRAL_120};
        font-size: 14px;
    }}
    
    /* ========== 状态标签 ========== */
    QFrame#statusTodo {{
        background-color: {NEUTRAL_20};
        border-radius: 3px;
        padding: 4px 8px;
    }}
    QFrame#statusInProgress {{
        background-color: {INFO_LIGHT};
        border-radius: 3px;
        padding: 4px 8px;
    }}
    QFrame#statusDone {{
        background-color: {SUCCESS_LIGHT};
        border-radius: 3px;
        padding: 4px 8px;
    }}
    
    QLabel#statusLabelTodo {{
        color: {NEUTRAL_100};
        font-size: 12px;
        font-weight: 500;
    }}
    QLabel#statusLabelInProgress {{
        color: {PRIMARY};
        font-size: 12px;
        font-weight: 500;
    }}
    QLabel#statusLabelDone {{
        color: {SUCCESS};
        font-size: 12px;
        font-weight: 500;
    }}
    
    /* ========== 详情面板 ========== */
    QFrame#detailPanel {{
        background-color: {NEUTRAL_0};
        border-left: 1px solid {NEUTRAL_40};
    }}
    
    QLabel#detailTitle {{
        color: {NEUTRAL_120};
        font-size: 20px;
        font-weight: 600;
    }}
    
    QLabel#detailLabel {{
        color: {NEUTRAL_80};
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
    }}
    
    QLineEdit#detailInput {{
        border: 2px solid {NEUTRAL_40};
        border-radius: 3px;
        padding: 8px 12px;
        color: {NEUTRAL_120};
        font-size: 14px;
    }}
    QLineEdit#detailInput:focus {{
        border-color: {PRIMARY};
    }}
    
    QTextEdit#detailEditor {{
        border: 2px solid {NEUTRAL_40};
        border-radius: 3px;
        padding: 8px 12px;
        color: {NEUTRAL_120};
        font-size: 14px;
        background-color: {NEUTRAL_0};
    }}
    QTextEdit#detailEditor:focus {{
        border-color: {PRIMARY};
    }}
    
    QPushButton#detailBtn {{
        background-color: {PRIMARY};
        color: {NEUTRAL_0};
        border: none;
        padding: 8px 16px;
        border-radius: 3px;
        font-size: 14px;
        font-weight: 500;
    }}
    QPushButton#detailBtn:hover {{
        background-color: {PRIMARY_DARK};
    }}
    
    QPushButton#detailBtnSecondary {{
        background-color: {NEUTRAL_20};
        color: {NEUTRAL_100};
        border: none;
        padding: 8px 16px;
        border-radius: 3px;
        font-size: 14px;
        font-weight: 500;
    }}
    QPushButton#detailBtnSecondary:hover {{
        background-color: {NEUTRAL_30};
    }}
    
    /* ========== 滚动条 ========== */
    QScrollBar:vertical {{
        background-color: {NEUTRAL_10};
        width: 8px;
        border-radius: 4px;
    }}
    QScrollBar::handle:vertical {{
        background-color: {NEUTRAL_50};
        border-radius: 4px;
        min-height: 20px;
    }}
    QScrollBar::handle:vertical:hover {{
        background-color: {NEUTRAL_70};
    }}
    QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{
        height: 0px;
    }}
    
    QScrollBar:horizontal {{
        background-color: {NEUTRAL_10};
        height: 8px;
        border-radius: 4px;
    }}
    QScrollBar::handle:horizontal {{
        background-color: {NEUTRAL_50};
        border-radius: 4px;
        min-width: 20px;
    }}
    QScrollBar::handle:horizontal:hover {{
        background-color: {NEUTRAL_70};
    }}
    QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {{
        width: 0px;
    }}
    
    /* ========== 组合框 ========== */
    QComboBox {{
        background-color: {NEUTRAL_0};
        border: 2px solid {NEUTRAL_40};
        border-radius: 3px;
        padding: 8px 12px;
        color: {NEUTRAL_120};
        font-size: 14px;
    }}
    QComboBox:focus {{
        border-color: {PRIMARY};
    }}
    QComboBox::drop-down {{
        border: none;
        padding-right: 8px;
    }}
    QComboBox::down-arrow {{
        width: 12px;
        height: 12px;
    }}
    QComboBox QAbstractItemView {{
        background-color: {NEUTRAL_0};
        border: 1px solid {NEUTRAL_40};
        border-radius: 3px;
        selection-background-color: {PRIMARY_LIGHT};
        selection-color: {PRIMARY};
    }}
    
    /* ========== 日期编辑 ========== */
    QDateEdit {{
        background-color: {NEUTRAL_0};
        border: 2px solid {NEUTRAL_40};
        border-radius: 3px;
        padding: 8px 12px;
        color: {NEUTRAL_120};
        font-size: 14px;
    }}
    QDateEdit:focus {{
        border-color: {PRIMARY};
    }}
    
    /* ========== 模态对话框 ========== */
    QDialog {{
        background-color: {NEUTRAL_0};
        border-radius: 8px;
    }}
    """
