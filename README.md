# Course Site Template 

> Rephrased with Gemini :(

I’ve flirted with various "simple" course templates before—Just-the-Docs, MkDocs, Notion, you name it—but none of them actually hit the spot.

And before you ask, "Why not just use Moodle?"

- If you’ve ever taught multiple sections of the exact same course, you know the absolute joy of doing the exact same chores over and over again. As someone who physically recoils at manual labor, it's deeply painful.

- So, here lies my attempt at an automated solution (or a chaotic experiment) to run my courses without losing my sanity.


---
---
---

## How to use?

> Written with claude :( 

A static web-based file browser for displaying course materials hosted on Google Drive with a modern, dark/light theme-enabled interface.

## 📖 Overview

This template creates an interactive course website that automatically crawls a Google Drive folder structure and presents it as a navigable file browser. Perfect for educators who want to organize and share course materials (PDFs, documents, links, etc.) with students in an organized, searchable interface.

### Key Features

- 🌐 **Static Site** - No backend required, deploy anywhere (GitHub Pages, Netlify, etc.)
- 📁 **Google Drive Integration** - Automatically crawls and catalogs your Drive folders
- 🔍 **Real-time Search** - Filter files and folders across all content
- 🌓 **Dark/Light Mode** - Toggle between themes with persistent preference
- 📢 **Announcements** - Display important messages and class notes
- 📝 **HTML Content** - Inject custom HTML sections for welcome messages or instructions
- 🗂️ **Collapsible Tree Navigation** - Sidebar with folder hierarchy
- 📱 **Responsive Design** - Works on desktop and mobile devices
- 🔗 **Direct Drive Links** - All materials link directly to Google Drive for viewing/downloading

## 🚀 Quick Start

### Prerequisites

- Python 3.6+ (for the crawler script)
- A Google Drive folder with course materials (set to "Anyone with the link can view")
- Modern web browser

### Installation

1. **Clone the repository**
   ```bash
   git clone git@github.com:ezmata-101/Course-Site-Template.git
   cd Course-Site-Template
   ```

2. **Install Python dependencies**
   ```bash
   pip install requests beautifulsoup4
   # Or use a virtual environment (recommended):
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install requests beautifulsoup4
   ```

3. **Configure the crawler**
   
   Edit `crawl.py` and set your Google Drive folder URL:
   ```python
   BASE_URL = "YOUR_GOOGLE_DRIVE_FOLDER_URL_HERE_(ANYONE_CAN_VIEW)"
   ```

4. **Run the crawler**
   ```bash
   python crawl.py
   ```
   
   This generates `filescatalog.js` containing your folder structure.

5. **Open the site**
   
   Open `index.html` in your web browser or serve it with a local server:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js (if you have http-server installed)
   npx http-server
   ```
   
   Navigate to `http://localhost:8000`

## 📂 Project Structure

```
.
├── index.html           # Main HTML template
├── index.js             # Core application logic
├── styles.css           # Styling (dark/light theme support)
├── crawl.py            # Google Drive crawler script
├── filescatalog.js     # Generated catalog (created by crawl.py)
├── index.txt           # (Optional) Reference to local HTML content
└── README.md           # This file
```

## 🎨 Customization

### Course Title

Edit `index.html` line 7:
```html
<title>COURSE_TITLE</title>
```

And line 26:
```html
<h1><a href="index.html">Course Page</a></h1>
```

### Course Path Mapping

If you want to support URL parameters for direct course navigation, edit the `map_diction` object in `index.js` (lines 10-17):

```javascript
const map_diction = {
    "stqa": "Software Testing & Quality Assurance",
    "ca": "Computer Architecture",
    "os-lab": "Operating Systems Laboratory",
    "dbms": "Database Management Systems - Theory",
    "dbms-lab": "Database Management Systems - Lab",
    "itoc": "Introduction to Computer"
}
```

Then you can navigate directly: `index.html?course=dbms/week-1`

### Crawler Settings

Edit `crawl.py` to adjust crawler behavior:

```python
REQUEST_DELAY_SEC = 0.5   # Delay between requests (be nice to Google)
MAX_DEPTH = None          # Limit crawl depth (None = unlimited)
OUTPUT_FILE = "filescatalog.js"  # Output filename
```

## 📢 Special Files

The crawler recognizes special files in your Google Drive folders:

### `announcements.txt`

Create a text file with announcements in CSV format:
```
Class 1 Canceled,https://example.com/announcement1
Exam on Friday,https://example.com/announcement2
Office Hours Changed,https://example.com/announcement3
```

Each line: `Title,URL`

### `index.html`

Create an HTML file to inject custom HTML content at the top of a folder view. Great for welcome messages, instructions, or embedded content.

### `index.txt`

A text file containing the filename of a local HTML file to load as content:
```
welcome.html
```

The crawler will read the local `welcome.html` and inject it as HTML content.

## 🔧 Advanced Configuration

### Theme Customization

Edit CSS variables in `styles.css` (lines 1-27):

```css
:root {
    --bg: #ffffff;
    --text: #222;
    --link: #1d4ed8;
    /* ... more variables ... */
}

:root.dark {
    --bg: #0b0f16;
    --text: #e5e7eb;
    /* ... dark theme variables ... */
}
```

### File Name Cleaning

The crawler automatically cleans file names. Customize the `clean_name()` function in `crawl.py` (lines 34-39):

```python
def clean_name(name: str) -> str:
    replace_array = [
        ("old_text", "new_text"),
        # Add more replacements
    ]
    for old, new in replace_array:
        name = name.replace(old, new)
    return re.sub(r"\s+", " ", name).strip()
```

## 🌐 Deployment

### GitHub Pages

1. Push your repository to GitHub
2. Ensure `filescatalog.js` is committed
3. Go to Settings → Pages
4. Select branch (main) and root directory
5. Save and wait for deployment

### Netlify

1. Push to GitHub/GitLab
2. Connect repository to Netlify
3. No build command needed
4. Publish directory: `/` (root)
5. Deploy

### Custom Hosting

Simply upload all files to any web hosting service. The site is entirely static.

## 🔄 Updating Content

When you add or modify files in Google Drive:

1. Run the crawler again:
   ```bash
   python crawl.py
   ```

2. The `filescatalog.js` file will be updated

3. Redeploy or refresh if serving locally

## 🛠️ Troubleshooting

### Crawler Issues

- **"Invalid folder link"**: Ensure your Google Drive URL contains `/folders/` and the folder is publicly viewable
- **Empty catalog**: Check folder permissions - must be "Anyone with the link can view"
- **Missing files**: Increase `REQUEST_DELAY_SEC` if Google is rate limiting

### Display Issues

- **Files not showing**: Clear browser cache and regenerate `filescatalog.js`
- **Theme not persisting**: Check browser localStorage is enabled
- **Search not working**: Ensure JavaScript is enabled

## 📋 Requirements

### Python Dependencies

```
requests>=2.25.0
beautifulsoup4>=4.9.0
```

### Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Any modern browser with ES6 support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is provided as-is for educational purposes. Feel free to modify and distribute.

## 🙏 Acknowledgments

- Built for organizing course materials efficiently
- Inspired by the need for simple, static course websites
- Uses Google Drive's embedded folder view for crawling

## 📧 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Check existing issues for solutions
- Fork and submit pull requests

---

**Made with ❤️ for educators and students**