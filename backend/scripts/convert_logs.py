import os

def convert_encoding(filename):
    if not os.path.exists(filename):
        print(f"File not found: {filename}")
        return
    
    try:
        # Try reading as UTF-16LE (Unicode in Windows PowerShell)
        with open(filename, 'r', encoding='utf-16') as f:
            content = f.read()
        
        # Write back as UTF-8
        temp_file = filename + '.tmp'
        with open(temp_file, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # Replace original
        os.remove(filename)
        os.rename(temp_file, filename)
        print(f"Successfully converted {filename} to UTF-8.")
    except Exception as e:
        print(f"Failed to convert {filename}: {e}")

if __name__ == "__main__":
    convert_encoding('backend_logs.txt')
    convert_encoding('logs.txt')
