import re

with open('vercel_main.js', 'r', encoding='utf-8') as f:
    data = f.read()

urls = re.findall(r'https?://[^\s\"\'\`)]+', data)
for url in sorted(list(set(urls))):
    print(url)
