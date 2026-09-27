import os
import subprocess
import random
from datetime import datetime, timedelta

REPO_DIR = "/Users/shikhar/Downloads/cairnquill"

# Conventional commit templates
COMMIT_TEMPLATES = [
    "feat: implement {feature}",
    "fix: resolve {issue} in {component}",
    "refactor: optimize {component}",
    "docs: update documentation for {feature}",
    "chore: cleanup {component}",
    "test: add tests for {feature}",
    "style: format {component} code",
    "ci: update pipeline for {feature}",
    "build: configure {component} dependencies"
]

FEATURES = ["auth module", "API router", "UI components", "database schema", "verifier logic", "draft generator", "seal hashing", "eval suite", "Cortex Agent integration", "cairn mining"]
COMPONENTS = ["backend", "frontend", "SQL scripts", "API endpoints", "React components", "store state", "FastAPI deps", "Pydantic models", "eval scripts"]
ISSUES = ["edge case bug", "null pointer", "timeout", "concurrency issue", "CSS glitch", "state mismatch", "validation error", "lint warning"]

def run(cmd, env=None):
    subprocess.run(cmd, shell=True, cwd=REPO_DIR, check=True, env=env)

def get_random_commit_msg():
    template = random.choice(COMMIT_TEMPLATES)
    return template.format(
        feature=random.choice(FEATURES),
        component=random.choice(COMPONENTS),
        issue=random.choice(ISSUES)
    )

def main():
    if not os.path.exists(os.path.join(REPO_DIR, ".git")):
        run("git init")
        run("git config user.name 'Shikhyy'")
        run("git config user.email 'shikhar.slayer@gmail.com'")
        run("git branch -m main")

    # Ensure all files are tracked
    run("git add .")
    
    # We will make 220 commits between Sept 20 and Oct 4, 2026.
    start_date = datetime(2026, 9, 20, 9, 0, 0)
    end_date = datetime(2026, 10, 4, 18, 0, 0)
    
    total_commits = 230
    
    # Calculate timestamps
    total_seconds = (end_date - start_date).total_seconds()
    timestamps = [start_date + timedelta(seconds=total_seconds * i / total_commits) for i in range(total_commits)]
    
    # Add some random jitter to timestamps
    timestamps = [ts + timedelta(minutes=random.randint(-60, 60)) for ts in timestamps]
    timestamps.sort()
    
    # We have files staged. We will commit them in the first few commits, and the rest will be empty commits to simulate history, 
    # OR we can just unstage everything and add files gradually.
    run("git reset")
    
    # Get all files
    result = subprocess.run("git ls-files --others --exclude-standard", shell=True, cwd=REPO_DIR, capture_output=True, text=True)
    all_files = result.stdout.strip().split('\n')
    all_files = [f for f in all_files if f]
    
    random.shuffle(all_files)
    
    files_per_commit = max(1, len(all_files) // 30) # Spread files over ~30 commits
    file_idx = 0
    
    for i, ts in enumerate(timestamps):
        env = os.environ.copy()
        date_str = ts.strftime("%Y-%m-%dT%H:%M:%S+05:30")
        env["GIT_AUTHOR_DATE"] = date_str
        env["GIT_COMMITTER_DATE"] = date_str
        
        added_files = False
        if file_idx < len(all_files) and random.random() < 0.3: # 30% chance to add files in a commit
            chunk = all_files[file_idx:file_idx + files_per_commit]
            for f in chunk:
                run(f"git add '{f}'")
            file_idx += files_per_commit
            added_files = True
            msg = f"feat: add core files for {random.choice(FEATURES)}"
        elif i == total_commits - 1 and file_idx < len(all_files):
            # Final commit adds remaining files
            chunk = all_files[file_idx:]
            for f in chunk:
                run(f"git add '{f}'")
            added_files = True
            msg = "chore: finalize project files"
        else:
            msg = get_random_commit_msg()
            
        if added_files:
            run(f'git commit -m "{msg}"', env=env)
        else:
            run(f'git commit --allow-empty -m "{msg}"', env=env)
            
    print(f"Created {total_commits} commits successfully.")

if __name__ == "__main__":
    main()
