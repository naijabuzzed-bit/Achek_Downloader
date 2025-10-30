
import sys
import os

# Add your application directory to the Python path
INTERP = "/home/zwmhqeer/virtualenv/downloader.achek.com.ng/3.11/bin/python3"
if sys.executable != INTERP:
    os.execl(INTERP, INTERP, *sys.argv)

# Add the application directory to sys.path
sys.path.insert(0, '/home/zwmhqeer/downloader.achek.com.ng')

# Import your Flask app
from app import app as application
