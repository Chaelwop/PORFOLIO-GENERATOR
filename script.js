  let projects = [];
        let profileImageUrl = '';
    let saveTimer;
    let isLoaded = false;

        const inputs = {
            name: document.getElementById('name'),
            role: document.getElementById('role'),
            bio: document.getElementById('bio'),
            email: document.getElementById('email'),
            location: document.getElementById('location'),
            profilePicture: document.getElementById('profilePicture'),
            projectTitle: document.getElementById('projectTitle'),
            projectDesc: document.getElementById('projectDesc'),
        };

        // Add event listeners for real-time preview
        [inputs.name, inputs.role, inputs.bio, inputs.email, inputs.location].forEach((input) => {
            input.addEventListener('input', () => {
                updatePreview();
                scheduleSave();
            });
        });

        // Handle profile picture upload
        inputs.profilePicture.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                document.getElementById('fileName').textContent = file.name;
                const reader = new FileReader();
                reader.onload = (event) => {
                    profileImageUrl = event.target.result;
                    updatePreview();
                    scheduleSave();
                };
                reader.readAsDataURL(file);
            } else {
                document.getElementById('fileName').textContent = 'No file selected';
                profileImageUrl = '';
                updatePreview();
                scheduleSave();
            }
        });

        async function loadPortfolio() {
            const status = document.getElementById('saveStatus');
            try {
                const response = await fetch('/api/portfolio');
                if (!response.ok) throw new Error('Unable to load portfolio');
                const data = await response.json();

                ['name', 'role', 'bio', 'email', 'location'].forEach((field) => {
                    if (!inputs[field].value) inputs[field].value = data[field] || '';
                });
                if (!profileImageUrl) profileImageUrl = data.profileImage || '';
                if (projects.length === 0) projects = data.projects || [];

                isLoaded = true;
                updateProjectsList();
                updatePreview();
                status.textContent = 'Saved locally';
                status.dataset.state = 'saved';
                scheduleSave();
            } catch (error) {
                isLoaded = true;
                status.textContent = 'Database unavailable';
                status.dataset.state = 'error';
                console.error(error);
            }
        }

        function scheduleSave() {
            clearTimeout(saveTimer);
            saveTimer = setTimeout(() => {
                if (!isLoaded) {
                    scheduleSave();
                    return;
                }
                savePortfolio();
            }, 500);
        }

        async function savePortfolio() {
            const status = document.getElementById('saveStatus');
            status.textContent = 'Saving...';
            status.dataset.state = '';
            try {
                const response = await fetch('/api/portfolio', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: inputs.name.value,
                        role: inputs.role.value,
                        bio: inputs.bio.value,
                        email: inputs.email.value,
                        location: inputs.location.value,
                        profileImage: profileImageUrl,
                        projects
                    })
                });
                if (!response.ok) throw new Error('Unable to save portfolio');
                status.textContent = 'Saved locally';
                status.dataset.state = 'saved';
            } catch (error) {
                status.textContent = 'Save failed';
                status.dataset.state = 'error';
                console.error(error);
            }
        }

        function addProject() {
            const title = inputs.projectTitle.value.trim();
            const desc = inputs.projectDesc.value.trim();

            if (!title) {
                alert('Please enter a project title');
                return;
            }

            projects.push({
                id: Date.now(),
                title: title,
                desc: desc
            });

            inputs.projectTitle.value = '';
            inputs.projectDesc.value = '';

            updateProjectsList();
            updatePreview();
            scheduleSave();
        }

        function removeProject(id) {
            projects = projects.filter(p => p.id !== id);
            updateProjectsList();
            updatePreview();
            scheduleSave();
        }

        function updateProjectsList() {
            const list = document.getElementById('projectsList');
            list.innerHTML = projects.map(p => `
                <div class="project-item">
                    <div class="project-title" title="${p.title}">${escapeHtml(p.title)}</div>
                    <button class="project-remove" onclick="removeProject(${p.id})">×</button>
                </div>
            `).join('');
        }

        function updatePreview() {
            const name = inputs.name.value.trim() || 'Your Name';
            const role = inputs.role.value.trim() || 'Your Role';
            const bio = inputs.bio.value.trim() || 'Your bio appears here';
            const email = inputs.email.value.trim();
            const location = inputs.location.value.trim();

            document.getElementById('displayName').textContent = escapeHtml(name);
            document.getElementById('displayRole').textContent = escapeHtml(role);
            document.getElementById('displayBio').textContent = escapeHtml(bio);

            // Update profile image
            const profileImageEl = document.getElementById('profileImage');
            if (profileImageUrl) {
                profileImageEl.innerHTML = `<img src="${profileImageUrl}" alt="Profile">`;
            } else {
                profileImageEl.innerHTML = '👤';
            }

            // Update email
            const emailDisplay = document.getElementById('emailDisplay');
            if (email) {
                emailDisplay.style.display = 'flex';
                emailDisplay.innerHTML = `📧 ${escapeHtml(email)}`;
            } else {
                emailDisplay.style.display = 'none';
            }

            // Update location
            const locationDisplay = document.getElementById('locationDisplay');
            if (location) {
                locationDisplay.style.display = 'flex';
                locationDisplay.innerHTML = `📍 ${escapeHtml(location)}`;
            } else {
                locationDisplay.style.display = 'none';
            }

            // Update projects display
            const projectsDisplay = document.getElementById('projectsDisplay');
            if (projects.length === 0) {
                projectsDisplay.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">✨</div>
                        <div class="empty-state-title">No projects yet</div>
                        <div class="empty-state-text">— add one from the editor to see it appear here.</div>
                    </div>
                `;
            } else {
                projectsDisplay.innerHTML = `
                    <div class="projects-grid">
                        ${projects.map(p => `
                            <div class="project-card">
                                <div class="project-card-title">${escapeHtml(p.title)}</div>
                                ${p.desc ? `<div class="project-card-desc">${escapeHtml(p.desc)}</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                `;
            }
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function downloadPortfolio() {
            const name = inputs.name.value.trim() || 'Portfolio';
            const role = inputs.role.value.trim() || '';
            const bio = inputs.bio.value.trim() || '';
            const email = inputs.email.value.trim() || '';
            const location = inputs.location.value.trim() || '';

            // Create standalone HTML
            const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(name)} - Portfolio</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        :root {
            --bg-primary: #0f0f0f;
            --bg-secondary: #1a1a1a;
            --text-primary: #ffffff;
            --text-secondary: #b0b0b0;
            --accent: #6b7dff;
            --border: #333333;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            padding: 40px 20px;
        }

        .container {
            max-width: 700px;
            margin: 0 auto;
        }

        .profile-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 40px 32px;
            margin-bottom: 32px;
            text-align: center;
        }

        .profile-image {
            width: 100px;
            height: 100px;
            border-radius: 10px;
            background: var(--bg-secondary);
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            border: 2px solid var(--border);
            font-size: 48px;
        }

        .profile-image img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .profile-name {
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 8px;
        }

        .profile-role {
            font-size: 14px;
            color: var(--accent);
            font-weight: 600;
            margin-bottom: 12px;
        }

        .profile-bio {
            font-size: 13px;
            line-height: 1.6;
            color: var(--text-secondary);
            margin-bottom: 20px;
        }

        .profile-info {
            display: flex;
            flex-direction: column;
            gap: 6px;
            font-size: 12px;
            color: var(--text-secondary);
        }

        .info-item {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }

        .selected-work {
            width: 100%;
        }

        .work-title {
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 24px;
        }

        .projects-grid {
            display: grid;
            gap: 16px;
        }

        .project-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 24px;
        }

        .project-card-title {
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 8px;
        }

        .project-card-desc {
            font-size: 13px;
            color: var(--text-secondary);
            line-height: 1.5;
        }

        .empty-state {
            text-align: center;
            padding: 60px 32px;
        }

        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 16px;
            opacity: 0.4;
        }

        .empty-state-text {
            font-size: 13px;
            color: var(--text-secondary);
        }

        @media print {
            body {
                padding: 20px;
            }

            .profile-card, .project-card {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="profile-card">
            <div class="profile-image">${profileImageUrl ? `<img src="${profileImageUrl}" alt="Profile">` : '👤'}</div>
            <div class="profile-name">${escapeHtml(name)}</div>
            ${role ? `<div class="profile-role">${escapeHtml(role)}</div>` : ''}
            ${bio ? `<div class="profile-bio">${escapeHtml(bio)}</div>` : ''}
            <div class="profile-info">
                ${email ? `<div class="info-item">📧 ${escapeHtml(email)}</div>` : ''}
                ${location ? `<div class="info-item">📍 ${escapeHtml(location)}</div>` : ''}
            </div>
        </div>

        <div class="selected-work">
            <div class="work-title">Selected work</div>
            ${projects.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-state-icon">✨</div>
                    <div class="empty-state-text">No projects added yet</div>
                </div>
            ` : `
                <div class="projects-grid">
                    ${projects.map(p => `
                        <div class="project-card">
                            <div class="project-card-title">${escapeHtml(p.title)}</div>
                            ${p.desc ? `<div class="project-card-desc">${escapeHtml(p.desc)}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    </div>
</body>
</html>`;

            // Create blob and download
            const blob = new Blob([htmlContent], { type: 'text/html' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${name.replace(/\\s+/g, '-')}-portfolio.html`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showToast('Portfolio downloaded successfully! 🎉');
        }

        function showToast(message) {
            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(100px)';
                setTimeout(() => document.body.removeChild(toast), 300);
            }, 3000);
        }

        // Initial preview and saved portfolio load
        updatePreview();
        loadPortfolio();