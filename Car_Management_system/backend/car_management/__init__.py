# Enable PyMySQL as MySQLdb fallback for Linux/cloud deployments
try:
    import pymysql
    pymysql.install_as_MySQLdb()
except ImportError:
    pass
