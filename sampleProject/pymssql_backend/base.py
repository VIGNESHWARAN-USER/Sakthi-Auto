import pymssql

from collections import namedtuple

from django.db.backends.base.base import BaseDatabaseWrapper
from django.db.backends.base.features import BaseDatabaseFeatures
from django.db.backends.base.operations import BaseDatabaseOperations
from django.db.backends.base.client import BaseDatabaseClient
from django.db.backends.base.introspection import BaseDatabaseIntrospection
from django.db.backends.base.validation import BaseDatabaseValidation
from django.db.backends.base.schema import BaseDatabaseSchemaEditor
from django.db.backends.base.creation import BaseDatabaseCreation
from django.db.utils import InterfaceError, OperationalError


class Database:
    InterfaceError = InterfaceError
    OperationalError = OperationalError


class DatabaseFeatures(BaseDatabaseFeatures):
    pass


class DatabaseOperations(BaseDatabaseOperations):
    def quote_name(self, name):
        if name is None:
            return None
        if name.startswith('[') and name.endswith(']'):
            return name
        return f'[{name}]'
        # Add Django default SQL operators mapping
    def limit_offset_sql(self, low_mark, high_mark):
        if low_mark == 0 and high_mark is not None:
            return f"ORDER BY (SELECT NULL) OFFSET 0 ROWS FETCH NEXT {high_mark} ROWS ONLY"
        elif high_mark is not None:
            offset = low_mark
            fetch = high_mark - low_mark
            return f"ORDER BY (SELECT NULL) OFFSET {offset} ROWS FETCH NEXT {fetch} ROWS ONLY"
        else:
            return ""




   

class DatabaseClient(BaseDatabaseClient):
    pass


class DatabaseIntrospection(BaseDatabaseIntrospection):
    def get_table_list(self, cursor):
        TableInfo = namedtuple("TableInfo", ["name", "type"])
        cursor.execute("""
            SELECT TABLE_NAME, TABLE_TYPE
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW')
        """)
        return [
            TableInfo(name=row[0], type='t' if row[1] == 'BASE TABLE' else 'v')
            for row in cursor.fetchall()
        ]


class DatabaseValidation(BaseDatabaseValidation):
    pass


class DatabaseSchemaEditor(BaseDatabaseSchemaEditor):
    pass


class DatabaseCreation(BaseDatabaseCreation):
    pass


class DatabaseWrapper(BaseDatabaseWrapper):
    vendor = 'mssql'
    display_name = 'Microsoft SQL Server'
    Database = pymssql

    features_class = DatabaseFeatures
    ops_class = DatabaseOperations
    client_class = DatabaseClient
    introspection_class = DatabaseIntrospection
    validation_class = DatabaseValidation
    schema_editor_class = DatabaseSchemaEditor
    creation_class = DatabaseCreation
    operators = {
        'exact': '= %s',
        'iexact': 'LIKE %s',
        'contains': 'LIKE %s',
        'icontains': 'LIKE %s',
        'regex': '~ %s',
        'iregex': '~* %s',
        'gt': '> %s',
        'gte': '>= %s',
        'lt': '< %s',
        'lte': '<= %s',
        'startswith': 'LIKE %s',
        'istartswith': 'LIKE %s',
        'endswith': 'LIKE %s',
        'iendswith': 'LIKE %s',
        # Add more operators as needed
    }


    def get_connection_params(self):
        settings_dict = self.settings_dict
        return {
            'server': settings_dict.get('HOST', 'localhost'),
            'user': settings_dict.get('USER', ''),
            'password': settings_dict.get('PASSWORD', ''),
            'database': settings_dict.get('NAME', ''),
            'port': int(settings_dict.get('PORT', 1433)),
        }

    def get_new_connection(self, conn_params):
        return pymssql.connect(**conn_params)

    def create_cursor(self, name=None):
        return self.connection.cursor()

    def init_connection_state(self):
        pass

    def is_usable(self):
        try:
            cursor = self.connection.cursor()
            cursor.execute("SELECT 1")
            cursor.fetchone()
        except:
            return False
        return True

    def _set_autocommit(self, autocommit):
        self.connection.autocommit(autocommit)

    def _close(self):
        if self.connection is not None:
            self.connection.close()
    
            
