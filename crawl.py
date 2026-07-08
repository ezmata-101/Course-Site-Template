# crawl_drive_to_catalog.py
# Rewrites your crawler to build catalog.json in the structure your JS expects:
# { "name", "type", "href", "children" }

import json
import os
import re
import time
from urllib.parse import parse_qs, urljoin, urlparse
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

BASE_URL = "YOUR_GOOGLE_DRIVE_FOLDER_URL_HERE_(ANYONE_CAN_VIEW)"
OUTPUT_FILE = "filescatalog.js"
REQUEST_DELAY_SEC = 0.5      # be gentle to Google
MAX_DEPTH = None             # e.g., 2 for testing; None = unlimited

# ---------- Helpers ----------

def extract_folder_id(url: str):
    """Extract a Google Drive folder ID from several common URL shapes."""
    m = re.search(r"/folders/([a-zA-Z0-9_-]+)", url)
    if m:
        return m.group(1)
    qs = parse_qs(urlparse(url).query)
    if "id" in qs and qs["id"]:
        return qs["id"][0]
    return None

def clean_name(name: str) -> str:
    # Add any source-specific scrub rules here
    replace_array = []
    for old, new in replace_array:
        name = name.replace(old, new)
    return re.sub(r"\s+", " ", name).strip()

def ensure_abs_href(href: str) -> str:
    if not href:
        return ""
    if href.startswith("http://") or href.startswith("https://"):
        return href
    if href.startswith("//"):
        return "https:" + href
    return urljoin("https://drive.google.com/", href.lstrip("/"))

def looks_like_folder(href: str) -> bool:
    href = href or ""
    return ("/folders/" in href) or ("embeddedfolderview" in href) or ("drive/folders" in href)

def looks_like_file(href: str) -> bool:
    href = href or ""
    return ("/file/d/" in href) or ("open?id=" in href) or ("uc?id=" in href)

def extract_subfolder_id(href: str):
    href = href or ""
    m = re.search(r"/folders/([a-zA-Z0-9_-]+)", href)
    if m:
        return m.group(1)
    qs = parse_qs(urlparse(href).query)
    if "id" in qs and qs["id"]:
        return qs["id"][0]
    return None

def make_session() -> requests.Session:
    s = requests.Session()
    retries = Retry(
        total=5,
        backoff_factor=0.6,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=frozenset(["GET"]),
    )
    s.mount("https://", HTTPAdapter(max_retries=retries))
    s.headers.update({
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                      "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    })
    return s

def read_drive_text_file(href: str):
    # read file content from Google Drive file link
    try:
        ID = href.split("/d/")[1].split("/")[0]
        url = f"https://drive.google.com/uc?export=download&id={ID}"
        res = requests.get(url)
        res.raise_for_status()
        content = res.text
        return content
    except Exception as e:
        print(f"❌ Failed to read text file from {href}: {e}")
        return None

def read_announcements(href: str):
    try:
        content = read_drive_text_file(href)
        announcements = []
        for line in content.splitlines():
            line = line.strip()
            if not line:
                continue
            parts = line.split(",", 1)
            if len(parts) != 2:
                continue
            title = clean_name(parts[0].strip())
            link = parts[1].strip()
            announcements.append({
                "name": title,
                "type": "announcement",
                "href": link
            })

        return announcements

    except Exception as e:
        print(f"❌ Failed to read announcements from {href}: \n{e}")
        return []
    
def read_index_from_local_file(file_href):
    try:
        local_file_name = read_drive_text_file(file_href)
        ROOT = Path(__file__).resolve().parent
        index_file_path = ROOT / local_file_name.strip()
        content = ""
        with open(index_file_path, "r", encoding="utf-8") as f:
            content = f.read()
        return {
            "name": local_file_name.strip(),
            "type": "htmlContent",
            "href": file_href,
            "content": content
        }
    except Exception as e:
        print(f"❌ Failed to read index.txt from {file_href}: {e}")
        return None
    
def read_announcements_local(file_href: str):
    try:
        local_file_name = read_drive_text_file(file_href)
        ROOT = Path(__file__).resolve().parent
        announcements_file_path = ROOT / local_file_name.strip()
        announcements = []
        with open(announcements_file_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                parts = line.split(",", 1)
                if len(parts) != 2:
                    continue
                title = clean_name(parts[0].strip())
                link = parts[1].strip()
                announcements.append({
                    "name": title,
                    "type": "announcement",
                    "href": link
                })
        return announcements
    except Exception as e:
        print(f"❌ Failed to read announcements.txt from {file_href}: \n{e}")
        return []

def get_html_item(href: str):
    # read file content from Google Drive file link
    try:
        return {
            "name": "index.html",
            "type": "htmlContent",
            "href": href,
            "content": read_drive_text_file(href)
        }
    except Exception as e:
        print(f"❌ Failed to read index.html from {href}: {e}")
        return None

# ---------- Crawler ----------

def crawl_folder(session: requests.Session, folder_id: str, name: str = "root",
                 depth: int = 0, visited=None) -> dict:
    """
    Returns a dict shaped like:
    {
      "name": <folder name>,
      "type": "folder",
      "href": "https://drive.google.com/drive/folders/<id>",
      "children": [ ... files and folders ... ]
    }
    """

    for i in range(0, depth):
        print(" ", end="")
    print(name) 

    if visited is None:
        visited = set()
    if folder_id in visited:
        return {"name": name, "type": "folder",
                "href": f"https://drive.google.com/drive/folders/{folder_id}",
                "children": []}
    if (MAX_DEPTH is not None) and (depth >= MAX_DEPTH):
        return {"name": name, "type": "folder",
                "href": f"https://drive.google.com/drive/folders/{folder_id}",
                "children": []}

    visited.add(folder_id)

    url = f"https://drive.google.com/embeddedfolderview?id={folder_id}#list"
    try:
        res = session.get(url, timeout=20)
        res.raise_for_status()
    except Exception as e:
        print(f"❌ Failed to fetch folder {folder_id}: {e}")
        return {"name": name, "type": "folder",
                "href": f"https://drive.google.com/drive/folders/{folder_id}",
                "children": []}

    soup = BeautifulSoup(res.text, "html.parser")

    # Primary selector; add fallbacks in case Google tweaks classes
    entries = soup.select(".flip-entry")
    if not entries:
        entries = soup.select("div.entry, li.entry, .folder .entry, .item")

    children = []
    seen_hrefs = set()  # de-dup repeated lines Google sometimes emits

    for div in entries:
        a = div.find("a")
        if not a:
            continue
        raw_name = a.text.strip()
        item_name = clean_name(raw_name)
        href = ensure_abs_href(a.get("href", ""))

        is_folder = looks_like_folder(href)
        is_file = looks_like_file(href) or not is_folder

        if is_folder:
            sub_id = extract_subfolder_id(href)
            # Normalize folder link to /drive/folders/<id> for consistency
            folder_href = f"https://drive.google.com/drive/folders/{sub_id}" if sub_id else href
            if folder_href in seen_hrefs:
                continue
            seen_hrefs.add(folder_href)

            if sub_id:
                child = crawl_folder(session, sub_id, name=item_name, depth=depth + 1, visited=visited)
            else:
                # If we cannot extract an ID, just add a leaf folder link with no children
                child = {"name": item_name, "type": "folder", "href": folder_href, "children": []}

            # Ensure the folder node has the normalized href
            child["href"] = folder_href
            child["type"] = "folder"
            children.append(child)

        elif is_file:
            file_href = href
            
            if file_href in seen_hrefs:
                continue
            
            seen_hrefs.add(file_href)

            if item_name.lower() == "announcements.txt":
                announcements = read_announcements(file_href)
                if len(announcements) > 0:
                    for announcement in announcements:
                        children.append(announcement)
                continue

            elif item_name.lower() == "index.html":
                index_content = get_html_item(file_href)
                if index_content:
                    children.append(index_content)
                continue

            elif item_name.lower() == "index.txt":
                index_content = read_index_from_local_file(file_href)
                if index_content:
                    children.append(index_content)
                continue

            elif item_name.lower() == "announcements.txt":
                announcements = read_announcements_local(file_href)
                if len(announcements) > 0:
                    for announcement in announcements:
                        children.append(announcement)
                continue

            else:
                children.append({
                    "name": item_name,
                    "type": "file",
                    "href": file_href
                })

    time.sleep(REQUEST_DELAY_SEC)

    node = {
        "name": name,
        "type": "folder",
        "href": f"https://drive.google.com/drive/folders/{folder_id}",
        "children": children
    }
    return node

# ---------- Main ----------

if __name__ == "__main__":
    print("📂 Google Drive → catalog.json")

    folder_id = extract_folder_id(BASE_URL)
    if not folder_id:
        raise SystemExit("❌ Invalid folder link.")

    session = make_session()
    catalog = crawl_folder(session, folder_id, name="root", depth=0, visited=set())


    ROOT = Path(__file__).resolve().parent

    with open(ROOT / OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write("const filescatalog = ")

        json.dump(catalog, f, indent=2, ensure_ascii=False)
        f.write(";\n")
    
    print(f"✅ Saved {OUTPUT_FILE} ({len(catalog.get('children', []))} top-level items)")
