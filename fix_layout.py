content = open(r'c:\Users\user\Desktop\3\buildai\src\components\layout\Layout.tsx', 'r').read()
content = content.replace('<Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />', '<Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onPageChange={onPageChange} />')
open(r'c:\Users\user\Desktop\3\buildai\src\components\layout\Layout.tsx', 'w').write(content)
print('Done')