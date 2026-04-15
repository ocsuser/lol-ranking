import subprocess

subprocess.run(['git', 'add', '.'])
subprocess.run(['git', 'commit', '-m', '..'])
subprocess.run(['git', 'push'])
