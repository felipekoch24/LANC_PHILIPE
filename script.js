let currentAvatar = "presave.png";
let todosDados = [];
let abaAtual = 'inicio';

window.addEventListener('DOMContentLoaded', () => {
    const savedName = localStorage.getItem('userName');
    const savedAvatar = localStorage.getItem('userAvatar');

    if (savedName && savedAvatar) {
        document.getElementById('username-input').value = savedName;
        currentAvatar = savedAvatar;
        document.getElementById('avatar-preview').src = currentAvatar;
        entrarApp();
    }
});

function setAvatar(src) {
    currentAvatar = src;
    document.getElementById('avatar-preview').src = src;
}

document.getElementById('gallery-input').addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            currentAvatar = e.target.result;
            document.getElementById('avatar-preview').src = currentAvatar;
        }
        reader.readAsDataURL(file);
    }
});

function entrarApp() {
    const name = document.getElementById('username-input').value.trim() || 'Usuário';

    localStorage.setItem('userName', name);
    localStorage.setItem('userAvatar', currentAvatar);

    document.getElementById('header-name').textContent = name;
    document.getElementById('header-avatar').src = currentAvatar;

    document.getElementById('profile-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'block';

    carregarLancamentos();
}

function trocarPerfil() {
    document.getElementById('app-screen').style.display = 'none';
    document.getElementById('profile-screen').style.display = 'flex';
}

function mudarAba(aba, elementoBtn) {
    abaAtual = aba;
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
    elementoBtn.classList.add('active');
    renderizarCards();
}

let dadosCarregados = false;
function carregarLancamentos() {
    if (dadosCarregados) return;
    dadosCarregados = true;

    fetch('lancamentos.json')
        .then(response => response.json())
        .then(data => {
            data.reverse();
            todosDados = data;
            renderizarCards();
        })
        .catch(error => console.error('Erro ao carregar os lançamentos:', error));
}

function parseDataAlvo(itemData) {
    const dataString = String(itemData).toUpperCase();
    if (dataString.includes('DEFINIR')) return null;

    if (itemData.includes('/')) {
        const [datePart, timePart] = itemData.split(' ');
        const [day, month, year] = datePart.split('/');
        return new Date(`${year}-${month}-${day}T${timePart || '00:00'}`);
    } else {
        return new Date(itemData.replace(' ', 'T'));
    }
}

function renderizarCards() {
    const container = document.getElementById('lancamentos-container');
    const devSection = document.getElementById('dev-section-container');
    container.innerHTML = '';

    if (abaAtual === 'suporte') {
        container.style.display = 'none';
        devSection.style.display = 'block';
        return;
    }

    container.style.display = 'grid';
    devSection.style.display = 'none';

    const now = new Date();
    let dadosFiltrados = [];

    if (abaAtual === 'inicio') {
        dadosFiltrados = todosDados.slice(0, 4);
    } else if (abaAtual === 'todos') {
        dadosFiltrados = todosDados;
    } else if (abaAtual === 'lancados') {
        dadosFiltrados = todosDados.filter(item => {
            const targetDate = parseDataAlvo(item.data);
            return targetDate && targetDate <= now;
        });
    } else if (abaAtual === 'proximos') {
        dadosFiltrados = todosDados.filter(item => {
            const targetDate = parseDataAlvo(item.data);
            const dataString = String(item.data).toUpperCase();
            if (dataString.includes('DEFINIR') || (targetDate && targetDate <= now)) return false;
            
            const diffTime = targetDate - now;
            const diffDays = diffTime / (1000 * 60 * 60 * 24);
            return diffDays >= 0 && diffDays <= 60;
        });

        dadosFiltrados.sort((a, b) => parseDataAlvo(a.data) - parseDataAlvo(b.data));
    }

    if (dadosFiltrados.length === 0) {
        container.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: #888; padding: 20px;">Nenhum item encontrado nesta categoria.</p>`;
        return;
    }

    dadosFiltrados.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';

        let dataFormatada = item.data;
        const dataString = String(item.data).toUpperCase();

        if (!dataString.includes('DEFINIR')) {
            const dataBruta = item.data.split(' ')[0];
            dataFormatada = dataBruta;

            if (dataBruta.includes('-')) {
                const [year, month, day] = dataBruta.split('-');
                dataFormatada = `${day}/${month}/${year}`;
            }
        }

        card.innerHTML = `
            <h3>${item.titulo}</h3>
            <video data-src="${item.arquivo}" controls preload="none" style="background: #000;"></video>
            <div class="data-lancamento">Data de lançamento: ${dataFormatada}</div>
            <div class="timer"></div>
        `;

        container.appendChild(card);

        const video = card.querySelector('video');

        video.addEventListener('play', () => {
            if (!video.getAttribute('src')) {
                video.src = video.getAttribute('data-src');
                video.load();
            }

            document.querySelectorAll('video').forEach(otherVideo => {
                if (otherVideo !== video) {
                    otherVideo.pause();
                }
            });
        });

        const timerElement = card.querySelector('.timer');
        
        function updateTimer() {
            if (dataString.includes('DEFINIR')) {
                timerElement.innerHTML = "Aguardando data oficial";
                return;
            }

            const targetDate = parseDataAlvo(item.data);
            const now = new Date();
            const diff = targetDate - now;

            if (diff <= 0) {
                timerElement.innerHTML = "Lançado!";
                return;
            }

            const seconds = Math.floor((diff / 1000) % 60);
            const minutes = Math.floor((diff / (1000 * 60)) % 60);
            const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
            const days = Math.floor((diff / (1000 * 60 * 60 * 24)) % 30);
            const months = Math.floor(diff / (1000 * 60 * 60 * 24 * 30));

            let textoTempo = "Faltam: ";

            if (months > 0) {
                textoTempo += `${months}m ${days}d`;
            } else if (days > 0) {
                textoTempo += `${days}d ${hours}h`;
            } else if (hours > 0) {
                textoTempo += `${hours}h ${minutes}min`;
            } else if (minutes > 0) {
                textoTempo += `${minutes}min ${seconds}s`;
            } else {
                textoTempo += `${seconds}s`;
            }

            timerElement.innerHTML = textoTempo;
        }

        updateTimer();
        
        if (!dataString.includes('DEFINIR')) {
            setInterval(updateTimer, 1000);
        }
    });
}

function abrirZoomDev() {
    document.getElementById('dev-zoom-modal').style.display = 'flex';
}

function fecharZoomDev() {
    document.getElementById('dev-zoom-modal').style.display = 'none';
                                           }
