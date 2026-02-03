import os

# 합치고 싶은 파일 확장자들
EXTENSIONS = ('.ts', '.tsx', '.js', '.jsx', '.css')
# 제외하고 싶은 폴더명
IGNORE_DIRS = {'node_modules', '.next', '.git', 'dist', 'build'}

def merge_files(start_path, output_filename):
    with open(output_filename, 'w', encoding='utf-8') as outfile:
        # 파일 상단에 프로젝트 요약 정보 적어주기
        outfile.write("Project: The Collegiate Grill POS System\n")
        outfile.write("Description: Full Source Code Context\n\n")

        for root, dirs, files in os.walk(start_path):
            # 제외할 폴더 걸러내기
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]

            for file in files:
                if file.endswith(EXTENSIONS):
                    file_path = os.path.join(root, file)
                    # 상대 경로로 표시 (예: src/app/page.tsx)
                    relative_path = os.path.relpath(file_path, start_path)
                    
                    try:
                        with open(file_path, 'r', encoding='utf-8') as infile:
                            # AI가 파일 구분을 잘 하도록 헤더 추가
                            outfile.write(f"\n{'='*50}\n")
                            outfile.write(f"FILE PATH: {relative_path}\n")
                            outfile.write(f"{'='*50}\n")
                            outfile.write(infile.read())
                            outfile.write("\n")
                    except Exception as e:
                        print(f"Skipping file {file}: {e}")

    print(f"✅ 성공! 모든 코드가 '{output_filename}' 파일 하나로 합쳐졌습니다.")

if __name__ == "__main__":
    # src 폴더의 내용을 긁어옵니다
    if os.path.exists('./src'):
        merge_files('./src', 'full_project_code.txt')
    else:
        print("❌ Error: 'src' 폴더를 찾을 수 없습니다. 프로젝트 루트에서 실행해 주세요.")