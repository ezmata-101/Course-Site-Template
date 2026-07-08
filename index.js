
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

// read the parameters from url
const urlParams = new URLSearchParams(window.location.search);
console.log('URL Parameters:', Object.fromEntries(urlParams.entries()));


const map_diction = {
    "stqa": "Software Testing & Quality Assurance",
    "ca": "Computer Architecture",
    "os-lab": "Operating Systems Laboratory",
    "dbms": "Database Management Systems - Theory",
    "dbms-lab": "Database Management Systems - Lab",
    "itoc": "Introduction to Computer"
}
const state = { catalog: filescatalog, path: [] };
// if a path parameter is provided in the URL, use it to set the initial path
if (urlParams.has('course')) {
    try {
        const coursePath = urlParams.get('course').split('/').filter(seg => seg.trim().length > 0);

        for (let i = 0; i < coursePath.length; i++) {
            if (map_diction[coursePath[i]]) {
                coursePath[i] = map_diction[coursePath[i]];
            }
        }

        const node = getNode(coursePath);
        if (node) {
            state.path = coursePath;
        }
    } catch (e) {
        console.error('Error parsing course path from URL:', e);
    }
}


function getNode(path) {
    console.log('getNode', path);
    let cur = state.catalog;
    for (const seg of path) {
        cur = (cur.children || []).find(x => x.name === seg);
        if (!cur) return null;
    }
    return cur;
}

// Flatten descendants (folders + files) with full paths for recursive search
function flatten(node, parentPath = []) {
    let out = [];
    (node.children || []).forEach(child => {
        const p = parentPath.concat(child.name);
        out.push(Object.assign({}, child, { _path: p }));
        if (child.type === 'folder') out = out.concat(flatten(child, p));
    });
    return out;
}

function renderAnnouncements() {
    // {
    //   name: "Class 1: Section C",
    //   type: "announcement",
    //   href: "https://example.com/announcement/class1"
    // }
    const node = getNode(state.path) || state.catalog;
    const items = (node.children || []).slice();
    const announcementRows = document.getElementById('announcementRows');
    announcementRows.innerHTML = '';
    for (const it of items) {
        if (it.type !== 'announcement') continue;
        const tr = document.createElement('tr');
        const nameCell = document.createElement('td'); nameCell.className = 'name';
        const link = document.createElement('a'); link.textContent = it.name; link.href = '#';
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (it.href) { window.open(it.href, '_blank', 'noopener'); }
        });
        nameCell.appendChild(link);
        tr.appendChild(nameCell);
        announcementRows.appendChild(tr);
    }

    const announcementsSection = document.getElementById('announcements');
    if (!announcementsSection.querySelector('tbody').children.length) {
        announcementsSection.style.display = 'none';
    } else {
        announcementsSection.style.display = 'block';
    }
}

function renderHtmlContent() {
    // {
    //   name: "Welcome Message",
    //   type: "htmlContent",
    //   content: "<h2>Welcome to the Course!</h2><p>This is the introductory message.</p>"
    // }
    const node = getNode(state.path) || state.catalog;
    const items = (node.children || []).slice();
    const htmlContentContainer = document.getElementById('htmlcontent');
    htmlContentContainer.innerHTML = '';
    for (const it of items) {
        if (it.type !== 'htmlContent') continue;
        const section = document.createElement('section');
        section.innerHTML = it.content || '';
        htmlContentContainer.appendChild(section);
    }

    const htmlContentSection = document.getElementById('htmlContent');
    if (htmlContentSection) {
        if (!htmlContentContainer.children.length) {
            htmlContentSection.style.display = 'none';
        } else {
            htmlContentSection.style.display = 'block';
        }
    }
}

// ===== Table render (files + folders) =====
function renderTable() {
    const node = getNode(state.path) || state.catalog;
    const rows = document.getElementById('rows'); rows.innerHTML = '';
    // Breadcrumbs
    const bc = document.getElementById('breadcrumbs');
    bc.innerHTML = '/ ' + state.path.map((seg, i) => `<a href="#" data-idx="${i}">${seg}</a>`).join(' / ');
    bc.querySelectorAll('a').forEach(a => a.addEventListener('click', (e) => { e.preventDefault(); const idx = +a.dataset.idx; state.path = state.path.slice(0, idx + 1); syncToTree(); renderTable(); }));

    // Parent row
    if (state.path.length) {
        const tr = document.createElement('tr');
        // tr.innerHTML = `<td class="name"><a href="#" id="parentLink">..</a></td><td class="type">Parent</td><td class="path">/${state.path.slice(0,-1).join(' / ')}</td>`;
        tr.innerHTML = `<td class="name"><a href="#" id="parentLink">↑ Previous Folder </a></td>`;
        rows.appendChild(tr);
        tr.querySelector('#parentLink').addEventListener('click', (e) => { e.preventDefault(); state.path.pop(); syncToTree(); renderTable(); });
    }

    const q = (document.getElementById('search').value || '').toLowerCase();
    let items;
    if (q) {
        items = flatten(node, state.path).filter(x => x.name.toLowerCase().includes(q));
    } else {
        items = (node.children || []).slice();
    }
    items.sort((a, b) => (a.type !== b.type) ? (a.type === 'folder' ? -1 : 1) : a.name.localeCompare(b.name));

    for (const it of items) {
        if (it.type === 'announcement' || it.type === 'htmlContent') continue;
        const tr = document.createElement('tr');
        const icon = document.createElement('span');
        icon.innerHTML = it.type == 'folder' ? '📁' : '📄';
        
        const nameCell = document.createElement('td'); nameCell.className = 'name';
        const typeCell = document.createElement('td'); typeCell.className = 'type';
        typeCell.textContent = it.type === 'folder' ? 'Folder' : 'File';
        const pathCell = document.createElement('td'); pathCell.className = 'path';
        const fullPath = it._path ? it._path : state.path.concat(it.name);
        pathCell.textContent = '/' + fullPath.join(' / ');

        const link = document.createElement('a'); link.textContent = it.name + (it.type === 'folder' ? '/' : ''); link.href = '#';
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (it.type === 'folder') {
                const dest = it._path ? it._path : state.path.concat(it.name);
                state.path = dest; syncToTree(); renderTable();
            }
            else if (it.href) { window.open(it.href, '_blank', 'noopener'); }
        });

        const drive_link = document.createElement('a');
        drive_link.className = "drive-link-icon";
        drive_link.addEventListener('click', (e) => {
            e.preventDefault();
            if (it.href) { window.open(it.href, '_blank', 'noopener'); }
        });
        drive_link.append(icon);
        nameCell.append(drive_link);
        nameCell.appendChild(link);
        tr.append(nameCell);
        rows.appendChild(tr);
    }

    const materialsTable = document.getElementById('materials');
    materialsTable.style.display = rows.children.length > 1 ? 'table' : 'none';

    renderAnnouncements();
    renderHtmlContent();
}

// ===== Sidebar Directory Tree (folders only) =====
function renderTree(node, parentPath = []) {
    const container = document.createElement('div');
    (node.children || []).filter(c => c.type === 'folder').forEach(child => {
        const nodeEl = document.createElement('div'); nodeEl.className = 'node';
        nodeEl.setAttribute('data-path', JSON.stringify([...parentPath, child.name]));

        const chev = document.createElement('span'); chev.className = 'chev'; chev.textContent = '▸';
        const label = document.createElement('span'); label.className = 'label'; label.textContent = child.name;

        nodeEl.append(chev, label);
        const kids = renderTree(child, [...parentPath, child.name]);
        kids.classList.add('children');

        if (parentPath.length === 0) { kids.classList.add('open'); chev.textContent = '▾'; }

        nodeEl.addEventListener('click', (e) => {
            e.stopPropagation();
            // toggle open + navigate
            kids.classList.toggle('open');
            chev.textContent = kids.classList.contains('open') ? '▾' : '▸';
            state.path = [...parentPath, child.name];
            renderTable();
        });

        container.appendChild(nodeEl);
        container.appendChild(kids);
    });
    return container;
}

function buildTree() {
    const root = state.catalog;
    const nav = document.getElementById('dirTree');
    nav.innerHTML = '';
    nav.appendChild(renderTree(root, []));
}

function syncToTree() {
    // expand all branch segments matching current path
    $$('.node').forEach(n => {
        const p = JSON.parse(n.getAttribute('data-path') || '[]');
        const match = state.path.slice(0, p.length).every((v, i) => v === p[i]);
        const next = n.nextElementSibling; // its children container
        if (next && next.classList.contains('children')) {
            if (match) { next.classList.add('open'); const chev = n.querySelector('.chev'); if (chev) chev.textContent = '▾'; }
        }
    });
}

function init() {
    // Theme
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') document.documentElement.classList.add('dark');
    document.getElementById('themeBtn').addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });

    document.getElementById('search').addEventListener('input', () => renderTable());

    buildTree();
    renderTable();
}

document.addEventListener('DOMContentLoaded', init);

// Always expand all tree nodes
document.querySelectorAll('#tree ul, #tree .children').forEach(ul => {
    ul.style.display = 'block';
});

// (Optional) If you were toggling per-folder collapse, disable those handlers:
document.querySelectorAll('#tree .toggle, #tree .expander').forEach(btn => {
    btn.replaceWith(btn.cloneNode(true)); // removes old listeners
});

const toggleTreeBtn = document.getElementById('toggleTreeBtn');
const dirTree = document.getElementById('dirTree');
dirTree.style.display = 'none';
toggleTreeBtn.textContent = 'Show Tree';

toggleTreeBtn.addEventListener('click', () => {
    if (dirTree.style.display === 'none') {
        dirTree.style.display = 'block';
        toggleTreeBtn.textContent = 'Hide Tree';
    } else {
        dirTree.style.display = 'none';
        toggleTreeBtn.textContent = 'Show Tree';
    }
});
