// Variables globales
let videoData = null;
let currentUser = null;
let videoId = null;

// Cargar la API de YouTube
let tag = document.createElement('script');
tag.src = 'https://www.youtube.com/iframe_api';
let firstScriptTag = document.getElementsByTagName('script')[0];
firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

// Variable para el reproductor de YouTube
let player;

// Función para crear el reproductor de YouTube
function onYouTubeIframeAPIReady() {
    // La función se ejecutará cuando se cargue la API de YouTube
    if (videoData && videoData.url_video) {
        createYouTubePlayer(videoData.url_video);
    }
}

// Ejecutar cuando se carga la página
document.addEventListener('DOMContentLoaded', () => {
    // Verificar si hay un usuario en sesión
    checkUserSession();
    
    // Obtener el ID del video de la URL
    const urlParams = new URLSearchParams(window.location.search);
    videoId = urlParams.get('id');
    console.log("videoId:", videoId);
    
    if (!videoId) {
        showError('No se especificó un video');
        return;
    }
    
    // Configurar eventos generales
    setupEventListeners();
    
    // Cargar los datos del video (esto iniciará el resto de cargas)
    loadVideo(videoId);
});

// Crear el contenedor de toasts si no existe
function createToastContainer() {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

// Verificar si hay un usuario en sesión
function checkUserSession() {
    const usuarioJSON = localStorage.getItem('usuario');
    
    if (usuarioJSON) {
        currentUser = JSON.parse(usuarioJSON);
        
        // Actualizar la interfaz para mostrar las opciones de usuario
        document.getElementById('auth-buttons').style.display = 'none';
        document.getElementById('user-menu').style.display = 'block';
        document.getElementById('user-name').textContent = currentUser.nombre_usuario;
        
        // Configurar evento de cierre de sesión
        document.getElementById('btn-logout').addEventListener('click', handleLogout);
        
        // Asegurarse de que el formulario de comentarios está visible para usuarios autenticados
        document.getElementById('comment-form-container').innerHTML = `
            <form id="comment-form">
                <textarea id="comment-text" placeholder="Añade un comentario..." rows="3"></textarea>
                <div class="comment-actions">
                    <button type="button" id="btn-cancel-comment">Cancelar</button>
                    <button type="submit" id="btn-submit-comment">Comentar</button>
                </div>
            </form>
        `;
        
        // Configurar eventos para el formulario
        setupCommentFormEvents();
    } else {
        // Si no hay usuario, mostrar mensaje de login
        document.getElementById('comment-form-container').innerHTML = `
            <div class="login-to-comment">
                <p>Inicia sesión para dejar un comentario</p>
                <a href="login.html" class="btn-login">Iniciar Sesión</a>
            </div>
        `;
    }
}

// Función para configurar eventos del formulario de comentarios
function setupCommentFormEvents() {
    const commentForm = document.getElementById('comment-form');
    const commentText = document.getElementById('comment-text');
    const submitButton = document.getElementById('btn-submit-comment');
    const cancelButton = document.getElementById('btn-cancel-comment');
    
    if (!commentForm) return;
    
    // Habilitar/deshabilitar el botón de comentar según haya texto
    commentText.addEventListener('input', () => {
        submitButton.disabled = commentText.value.trim() === '';
    });
    
    // Inicialmente deshabilitar el botón
    submitButton.disabled = true;
    
    // Botón de cancelar
    cancelButton.addEventListener('click', () => {
        commentText.value = '';
        submitButton.disabled = true;
    });
    
    // Enviar comentario
    commentForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const texto = commentText.value.trim();
        
        if (!texto) return;
        
        try {
            // Mostrar indicador de carga
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            
            const response = await fetch(`${API_URL}/comentarios`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id_video: videoId,
                    id_usuario: currentUser.id_usuario,
                    texto: texto
                })
            });
            
            if (!response.ok) {
                throw new Error('Error al enviar el comentario');
            }
            
            const nuevoComentario = await response.json();
            
            // Limpiar el formulario
            commentText.value = '';
            
            // Restaurar el botón
            submitButton.disabled = true;
            submitButton.innerHTML = 'Comentar';
            
            // Actualizar la lista de comentarios directamente sin recargar
            const commentsContainer = document.getElementById('comments-list');
            
            // Crear el nuevo elemento de comentario
            const commentElement = document.createElement('div');
            commentElement.className = 'comment-item';
            commentElement.innerHTML = `
                <div class="comment-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="comment-content">
                    <div class="comment-header">
                        <span class="comment-author">${currentUser.nombre_usuario}</span>
                        <span class="comment-date">Ahora mismo</span>
                    </div>
                    <p class="comment-text">${texto}</p>
                </div>
            `;
            
            // Si hay un mensaje de "no hay comentarios", eliminarlo
            const noComments = commentsContainer.querySelector('.no-comments');
            if (noComments) {
                commentsContainer.innerHTML = '';
            }
            
            // Insertar el nuevo comentario al principio de la lista
            commentsContainer.insertBefore(commentElement, commentsContainer.firstChild);
        } catch (error) {
            console.error('Error:', error);
            showCustomAlert('No se pudo enviar el comentario', 'error');
            
            // Restaurar el botón en caso de error
            submitButton.disabled = false;
            submitButton.innerHTML = 'Comentar';
        }
    });
}

// Añadir CSS adicional para los comentarios
const commentStyles = document.createElement('style');
commentStyles.textContent = `
    /* Estilos para el contenedor de login */
    .login-to-comment {
        background-color: #f8f9fa;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        margin-bottom: 20px;
        border: 1px solid #e5e7eb;
    }

    .login-to-comment p {
        margin-bottom: 15px;
        color: #606060;
        font-size: 1rem;
    }

    .login-to-comment .btn-login {
        display: inline-block;
        padding: 8px 18px;
        background-color: #065fd4;
        color: white;
        font-weight: 500;
        border-radius: 4px;
        text-decoration: none;
        transition: background-color 0.2s;
    }

    .login-to-comment .btn-login:hover {
        background-color: #0356c0;
    }
    
    /* Estilos para el formulario de comentarios */
    #comment-form {
        margin-bottom: 20px;
    }
    
    #comment-text {
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        resize: vertical;
        font-family: inherit;
    }
    
    .comment-actions {
        display: flex;
        justify-content: flex-end;
        margin-top: 10px;
        gap: 10px;
    }
    
    #btn-cancel-comment {
        padding: 8px 15px;
        background: transparent;
        border: none;
        cursor: pointer;
        color: #606060;
    }
    
    #btn-submit-comment {
        padding: 8px 15px;
        background-color: #065fd4;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    
    #btn-submit-comment:disabled {
        background-color: #ccc;
        cursor: not-allowed;
    }
    
    /* Estilos para la lista de comentarios */
    .comment-item {
        display: flex;
        gap: 12px;
        margin-bottom: 20px;
        padding-bottom: 20px;
        border-bottom: 1px solid #eee;
    }
    
    .comment-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: #f0f0f0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #606060;
    }
    
    .comment-content {
        flex: 1;
    }
    
    .comment-header {
        display: flex;
        gap: 8px;
        align-items: center;
        margin-bottom: 5px;
    }
    
    .comment-author {
        font-weight: 500;
        color: #333;
    }
    
    .comment-date {
        font-size: 0.8rem;
        color: #606060;
    }
    
    .comment-text {
        margin: 0;
        line-height: 1.4;
    }
`;
document.head.appendChild(commentStyles);

// Cargar los datos del video
async function loadVideo(id) {
    try {
        console.log(`Cargando video con ID: ${id}`);
        const response = await fetch(`${API_URL}/videos/${id}`);
        
        if (!response.ok) {
            throw new Error('Error al cargar el video');
        }
        
        videoData = await response.json();
        console.log('Datos del video obtenidos:', videoData);
        
        // Actualizar la interfaz con los datos del video
        updateVideoUI(videoData);
        
        // Crear el reproductor de YouTube 
        createYouTubePlayer(videoData.url_video);
        
        // Cargar valoraciones
        await loadRatingData();
        setupRating();
        
        // Cargar comentarios
        loadComments(id);
        
        // Cargar videos relacionados
        loadRelatedVideos(id);
        
        // Cargar otros datos
        loadLikeStatus();
        loadLikesCount();
        loadSubscriptionStatus();
        loadSubscriberCount();
    } catch (error) {
        console.error('Error:', error);
        showError('No se pudo cargar el video');
    }
}

// Función para la valoración
function setupRating() {
    const ratingSelect = document.getElementById('rating-select');
    const ratingSubmit = document.getElementById('rating-submit');
    const ratingForm = document.querySelector('.rating-form');
    
    // Verificar si el usuario está logueado
    if (!currentUser) {
        // Ocultar el formulario de valoración para usuarios no autenticados
        if (ratingForm) {
            ratingForm.innerHTML = `
                <p class="login-message">Debes <a href="login.html">iniciar sesión</a> para valorar este video</p>
            `;
        }
        return; // Salir de la función si no hay usuario
    }
    
    // Continuar con la configuración normal si hay usuario
    ratingSubmit.addEventListener('click', async () => {
        const ratingValue = parseInt(ratingSelect.value, 10);

        // Validar que se haya seleccionado una valoración válida
        if (!ratingValue || ratingValue < 1 || ratingValue > 5) {
            showCustomAlert('Por favor, selecciona una valoración válida.', 'error');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/valoraciones`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id_usuario: currentUser.id_usuario,
                    id_video: videoId,
                    valoracion: ratingValue
                })
            });
            const result = await response.json();

            if (response.ok) {
                // Mostrar mensaje de éxito
                showCustomAlert(result.message || 'Valoración registrada correctamente', 'success');
                
                // Actualizar la interfaz inmediatamente sin necesidad de recargar
                updateRatingDisplay(ratingValue);
            } else {
                // Mostrar mensaje de error
                showCustomAlert(result.error || 'Error al registrar la valoración', 'error');
            }
        } catch (error) {
            console.error('Error al enviar la valoración:', error);
            showCustomAlert('Error al enviar la valoración. Inténtalo de nuevo.', 'error');
        }
    });
}

function updateRatingDisplay(newRating) {
    // Obtener elementos
    const ratingAvg = document.getElementById('rating-average');
    const ratingCount = document.getElementById('rating-count');
    
    if (ratingAvg && ratingCount) {
        // Obtener valores actuales
        const currentAvg = parseFloat(ratingAvg.textContent) || 0;
        const currentCountText = ratingCount.textContent || '(0 valoraciones)';
        const currentCount = parseInt(currentCountText.match(/\d+/)[0]) || 0;
        
        // Verificar si es una valoración nueva o una actualización
        const isNewRating = !document.getElementById('rating-select').getAttribute('data-has-rated');
        
        if (isNewRating) {
            // Si es una valoración nueva, incrementar el contador
            const newCount = currentCount + 1;
            
            // Calcular nuevo promedio
            const newAvg = ((currentAvg * currentCount) + newRating) / newCount;
            
            // Actualizar la interfaz
            ratingAvg.textContent = newAvg.toFixed(1);
            ratingCount.textContent = `(${newCount} valoracion${newCount !== 1 ? 'es' : ''})`;
            
            // Marcar que el usuario ya ha valorado
            document.getElementById('rating-select').setAttribute('data-has-rated', 'true');
        } else {
            // Si es una actualización, recalcular el promedio
            const newAvg = ((currentAvg * currentCount) - parseFloat(document.getElementById('rating-select').value) + newRating) / currentCount;
            
            // Actualizar solo el promedio
            ratingAvg.textContent = newAvg.toFixed(1);
        }
        
        // Actualizar la selección
        document.getElementById('rating-select').value = newRating;
    }
}

// Función para cargar datos de valoración (promedio, valoración del usuario)
// Función modificada para cargar datos de valoración
async function loadRatingData() {
    try {
        // Obtener promedio de valoraciones
        const avgResponse = await fetch(`${API_URL}/valoraciones/video/${videoId}/promedio`);
        if (avgResponse.ok) {
            const avgData = await avgResponse.json();
            
            // Actualizar la interfaz con el promedio y total de valoraciones
            const ratingAvg = document.getElementById('rating-average');
            if (ratingAvg) {
                ratingAvg.textContent = avgData.promedio;
            }
            
            const ratingCount = document.getElementById('rating-count');
            if (ratingCount) {
                const count = avgData.total || 0;
                ratingCount.textContent = `(${count} valoracion${count !== 1 ? 'es' : ''})`;
            }
        }
        
        // Si hay usuario logueado, obtener su valoración
        if (currentUser) {
            const userResponse = await fetch(`${API_URL}/valoraciones/video/${videoId}/usuario/${currentUser.id_usuario}`);
            if (userResponse.ok) {
                const userData = await userResponse.json();
                
                // Actualizar el selector con la valoración del usuario
                const ratingSelect = document.getElementById('rating-select');
                if (ratingSelect && userData.valoracion) {
                    ratingSelect.value = userData.valoracion;
                    // Marcar que el usuario ya ha valorado
                    ratingSelect.setAttribute('data-has-rated', 'true');
                }
            }
        }
    } catch (error) {
        console.error('Error al cargar datos de valoración:', error);
    }
}




// Cargar el estado de suscripción del usuario actual
async function loadSubscriptionStatus() {
    if (!currentUser || !videoData) return;
    
    // Ocultar botón de suscripción si el video es del usuario actual
    if (currentUser.id_usuario === videoData.id_usuario) {
        document.getElementById('btn-subscribe').style.display = 'none';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/suscripciones/verificar/${currentUser.id_usuario}/${videoData.id_usuario}`);
        
        if (!response.ok) {
            throw new Error('Error al verificar suscripción');
        }
        
        const data = await response.json();
        const subscribeBtn = document.getElementById('btn-subscribe');
        
        if (data.suscrito) {
            subscribeBtn.classList.add('subscribed');
            subscribeBtn.textContent = 'Suscrito';
        } else {
            subscribeBtn.classList.remove('subscribed');
            subscribeBtn.textContent = 'Suscribirse';
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Cargar la cantidad de suscriptores
async function loadSubscriberCount() {
    if (!videoData) return;
    
    try {
        const response = await fetch(`${API_URL}/suscripciones/cantidad/${videoData.id_usuario}`);
        
        if (!response.ok) {
            throw new Error('Error al cargar cantidad de suscriptores');
        }
        
        const data = await response.json();
        
        // Actualizar el contador en la interfaz
        document.getElementById('subscriber-count').textContent = 
            `${data.cantidad} suscriptor${data.cantidad !== 1 ? 'es' : ''}`;
    } catch (error) {
        console.error('Error:', error);
    }
}

// Crear una nueva suscripción
async function createSubscription() {
    if (!currentUser || !videoData) return;
    
    try {
        const response = await fetch(`${API_URL}/suscripciones`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id_suscriptor: currentUser.id_usuario,
                id_suscrito: videoData.id_usuario
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al suscribirse');
        }
        
        // Actualizar el botón
        const subscribeBtn = document.getElementById('btn-subscribe');
        subscribeBtn.classList.add('subscribed');
        subscribeBtn.textContent = 'Suscrito';
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'Error al suscribirse');
    }
}

// Cancelar una suscripción
async function cancelSubscription() {
    if (!currentUser || !videoData) return;
    
    try {
        const response = await fetch(`${API_URL}/suscripciones/${currentUser.id_usuario}/${videoData.id_usuario}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al cancelar suscripción');
        }
        
        // Actualizar el botón
        const subscribeBtn = document.getElementById('btn-subscribe');
        subscribeBtn.classList.remove('subscribed');
        subscribeBtn.textContent = 'Suscribirse';
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'Error al cancelar suscripción');
    }
}

// Actualizar la interfaz con los datos del video
function updateVideoUI(video) {
    // Actualizar el título de la página
    document.title = `${video.titulo} - NTTube`;
    
    // Actualizar elementos en la página
    document.getElementById('video-title').textContent = video.titulo;
    document.getElementById('video-date').textContent = `Subido el ${formatDate(video.fecha_subida)}`;
    document.getElementById('video-genre').textContent = video.genero;
    document.getElementById('uploader-name').textContent = video.nombre_usuario;
    
    // Actualizar la descripción (si existe)
    if (video.descripcion) {
        document.getElementById('video-description-text').textContent = video.descripcion;
    } else {
        document.getElementById('video-description-text').textContent = 'No hay descripción disponible.';
    }
    
    // Verificar si el video pertenece al usuario actual
    if (currentUser && video.id_usuario === currentUser.id_usuario) {
        document.getElementById('btn-subscribe').style.display = 'none';
    }

    // Mostrar visualizaciones si tienes un elemento para ello
    const viewsElement = document.getElementById('video-views');
    if (viewsElement && video.visitas !== undefined) {
        viewsElement.textContent = `${video.visitas} visualizaciones`;
    }
}

// Crear el reproductor de YouTube
function createYouTubePlayer(url) {
    // Extraer el ID del video de YouTube
    const videoId = extractYouTubeId(url);
    
    if (!videoId) {
        console.error('URL de YouTube no válida:', url);
        
        // Mostrar mensaje de error en lugar del reproductor
        document.getElementById('player-container').innerHTML = `
            <div class="error-message" style="padding: 2rem; text-align: center; background-color: #f8f8f8;">
                <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: #cc0000; margin-bottom: 1rem;"></i>
                <p>No se pudo cargar el video. URL no válida.</p>
                <p style="font-size: 0.8rem; margin-top: 0.5rem;">${url}</p>
            </div>
        `;
        return;
    }
    
    // Limpiar el contenedor antes de crear el reproductor
    const playerContainer = document.getElementById('player-container');
    playerContainer.innerHTML = '';
    
    // Crear un elemento iframe para el reproductor
    const iframe = document.createElement('iframe');
    iframe.width = '100%';
    iframe.height = '100%';
    iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    
    // Añadir el iframe al contenedor
    playerContainer.appendChild(iframe);

    // Registrar visualización
    registerView();
    
    console.log('Reproductor de YouTube creado con ID:', videoId);
}

// Función para registrar visualización
async function registerView() {
    if (!videoId) return;
    
    try {
        // Obtener el identificador de sesión
        const sessionId = generateSessionId();
        
        const response = await fetch(`${API_URL}/videos/${videoId}/visualizacion`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                session_id: sessionId
            })
        });
        
        if (!response.ok) {
            throw new Error('Error al registrar visualización');
        }
        
        const data = await response.json();
        console.log('Respuesta del servidor:', data);
        
        // Actualizar el contador de visualizaciones en la interfaz
        updateViewCount(data.visitas);
        
    } catch (error) {
        console.error('Error al registrar visualización:', error);
    }
}

// Función para actualizar el contador de visualizaciones en la interfaz
function updateViewCount(count) {
    const viewsElement = document.getElementById('video-views');
    if (viewsElement) {
        viewsElement.textContent = `${count} visualización${count !== 1 ? 'es' : ''}`;
    }
}


// Extraer el ID del video de YouTube
function extractYouTubeId(url) {
    // Patrones comunes de URL de YouTube
    const patterns = [
        /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/,
        /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=([^&]+).*/,
        /^(https?:\/\/)?(www\.)?youtu\.be\/([^?]+).*/
    ];
    
    let videoId = null;
    
    // Probar cada patrón
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && (match[2] || match[3])) {
            videoId = match[2] || match[3];
            if (videoId.length === 11) {
                return videoId;
            }
        }
    }
    
    console.error('No se pudo extraer el ID del video de YouTube de la URL:', url);
    return null;
}

// Variables para el control de visualizaciones
let videoStarted = false;
let viewRegistered = false;

// Generar un identificador único para la sesión
function generateSessionId() {
    // Usar el sessionId existente si está disponible
    let sessionId = localStorage.getItem('nttube_session_id');
    
    // Si no existe, crear uno nuevo
    if (!sessionId) {
        sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('nttube_session_id', sessionId);
    }
    
    return sessionId;
}

// Modificar el onPlayerReady para registrar la visualización solo al comenzar la reproducción
function onPlayerReady(event) {
    console.log('Reproductor de YouTube listo');
    
    // Añadir evento para controlar el estado del reproductor
    player.addEventListener('onStateChange', function(stateEvent) {
        // Estado 1 = reproduciendo
        if (stateEvent.data === 1 && !videoStarted) {
            videoStarted = true;
            console.log('Video comenzó a reproducirse');
            
            // Registrar visualización solo una vez por reproducción
            if (!viewRegistered) {
                registerView();
                viewRegistered = true;
            }
        }
    });
}

// Cargar los comentarios del video
async function loadComments(videoId) {
    try {
        const response = await fetch(`${API_URL}/comentarios/video/${videoId}`);
        
        if (!response.ok) {
            throw new Error('Error al cargar los comentarios');
        }
        
        const comentarios = await response.json();
        
        // Actualizar la interfaz con los comentarios
        displayComments(comentarios);
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('comments-list').innerHTML = `
            <div class="error-message">No se pudieron cargar los comentarios</div>
        `;
    }
}

// Mostrar los comentarios en la interfaz
function displayComments(comentarios) {
    const commentsContainer = document.getElementById('comments-list');
    
    // Ocultar el spinner de carga
    commentsContainer.querySelector('.loading-spinner').style.display = 'none';
    
    if (comentarios.length === 0) {
        commentsContainer.innerHTML = `
            <div class="no-comments">
                <p>No hay comentarios todavía. Sé el primero en comentar.</p>
            </div>
        `;
        return;
    }
    
    // Ordenar comentarios por fecha (más recientes primero)
    comentarios.sort((a, b) => new Date(b.fecha_comentario) - new Date(a.fecha_comentario));
    
    const commentsHTML = comentarios.map(comment => `
        <div class="comment-item">
            <div class="comment-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="comment-content">
                <div class="comment-header">
                    <span class="comment-author">${comment.nombre_usuario}</span>
                    <span class="comment-date">${formatDate(comment.fecha_comentario)}</span>
                </div>
                <p class="comment-text">${comment.texto}</p>
            </div>
        </div>
    `).join('');
    
    commentsContainer.innerHTML = commentsHTML;
}

// Cargar videos relacionados por género
async function loadRelatedVideos(currentVideoId) {
    try {
        // Asegurarnos de que tenemos los datos del video actual
        if (!videoData || !videoData.id_genero) {
            console.log('Esperando datos del video actual para cargar videos relacionados');
            // Si aún no tenemos los datos del video, esperar 500ms y volver a intentar
            setTimeout(() => loadRelatedVideos(currentVideoId), 500);
            return;
        }
        
        console.log(`Cargando videos relacionados del género: ${videoData.genero} (ID: ${videoData.id_genero})`);
        
        // Cargar videos del mismo género
        const response = await fetch(`${API_URL}/videos/genero/${videoData.id_genero}`);
        
        if (!response.ok) {
            throw new Error('Error al cargar videos del mismo género');
        }
        
        let videosDelMismoGenero = await response.json();
        
        // Filtrar el video actual
        videosDelMismoGenero = videosDelMismoGenero.filter(video => video.id_video != currentVideoId);
        
        // Verificar si tenemos suficientes videos del mismo género
        if (videosDelMismoGenero.length < 3) {
            console.log('No hay suficientes videos del mismo género, añadiendo otros videos populares');
            
            // Si no hay suficientes videos del mismo género, cargar algunos videos populares
            const popularResponse = await fetch(`${API_URL}/videos`);
            
            if (popularResponse.ok) {
                const videosPopulares = await popularResponse.json();
                
                // Filtrar videos que ya están incluidos y el video actual
                const videosAdicionalesPopulares = videosPopulares.filter(video => 
                    video.id_video != currentVideoId && 
                    !videosDelMismoGenero.some(v => v.id_video == video.id_video)
                );
                
                // Unir los videos del mismo género con algunos videos populares
                videosDelMismoGenero = [
                    ...videosDelMismoGenero,
                    ...videosAdicionalesPopulares.slice(0, 6) // Limitar a 6 videos adicionales como máximo
                ];
            }
        }
        
        // Limitar a 6 videos en total
        const videosRelacionados = videosDelMismoGenero.slice(0, 6);
        
        console.log(`Se encontraron ${videosRelacionados.length} videos relacionados`);
        
        // Mostrar los videos relacionados
        displayRelatedVideos(videosRelacionados);
    } catch (error) {
        console.error('Error al cargar videos relacionados:', error);
        document.getElementById('related-videos-container').innerHTML = `
            <div class="error-message">No se pudieron cargar los videos relacionados</div>
        `;
    }
}

// Mostrar los videos relacionados en la interfaz (función mejorada)
function displayRelatedVideos(videos) {
    const container = document.getElementById('related-videos-container');
    
    // Asegurarnos de que el contenedor existe
    if (!container) {
        console.error('Contenedor de videos relacionados no encontrado');
        return;
    }
    
    // Ocultar el spinner de carga si existe
    const loadingSpinner = container.querySelector('.loading-spinner');
    if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
    }
    
    if (videos.length === 0) {
        container.innerHTML = `
            <div class="no-videos">
                <p>No hay videos relacionados disponibles</p>
            </div>
        `;
        return;
    }
    
    const videosHTML = videos.map(video => `
        <div class="related-video-card" data-id="${video.id_video}">
            <div class="related-thumbnail">
                <img src="${getYouTubeThumbnail(video.url_video)}" alt="${video.titulo}">
                ${video.genero ? `<span class="video-genre">${video.genero}</span>` : ''}
            </div>
            <div class="related-info">
                <h3 class="related-title">${video.titulo}</h3>
                <div class="related-meta">
                    <div>${video.nombre_usuario}</div>
                    <div>${formatDate(video.fecha_subida)}</div>
                </div>
            </div>
        </div>
    `).join('');
    
    container.innerHTML = videosHTML;
    
    // Agregar evento de clic a los videos relacionados
    document.querySelectorAll('.related-video-card').forEach(card => {
        card.addEventListener('click', () => {
            const videoId = card.getAttribute('data-id');
            window.location.href = `video.html?id=${videoId}`;
        });
    });
}

// Configurar los event listeners
function setupEventListeners() {
    // Eventos para el formulario de comentarios (si el usuario está logueado)
    if (currentUser) {
        const commentForm = document.getElementById('comment-form');
        const commentText = document.getElementById('comment-text');
        const submitButton = document.getElementById('btn-submit-comment');
        const cancelButton = document.getElementById('btn-cancel-comment');
        
        // Habilitar/deshabilitar el botón de comentar según haya texto
        commentText.addEventListener('input', () => {
            submitButton.disabled = commentText.value.trim() === '';
        });
        
        // Botón de cancelar
        cancelButton.addEventListener('click', () => {
            commentText.value = '';
            submitButton.disabled = true;
        });
        
        // Enviar comentario
        commentForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const texto = commentText.value.trim();
            
            if (!texto) return;
            
            try {
                // Mostrar un indicador de carga
                submitButton.disabled = true;
                submitButton.textContent = 'Enviando...';
                
                const response = await fetch(`${API_URL}/comentarios`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        id_video: videoId,
                        id_usuario: currentUser.id_usuario,
                        texto: texto
                    })
                });
                
                if (!response.ok) {
                    throw new Error('Error al enviar el comentario');
                }
                
                const nuevoComentario = await response.json();
                
                // Limpiar el formulario
                commentText.value = '';
                
                // Restaurar el botón
                submitButton.disabled = true;
                submitButton.textContent = 'Comentar';
                
                // Actualizar la lista de comentarios directamente sin recargar
                const commentsContainer = document.getElementById('comments-list');
                
                // Crear el nuevo elemento de comentario
                const commentElement = document.createElement('div');
                commentElement.className = 'comment-item';
                commentElement.innerHTML = `
                    <div class="comment-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div class="comment-content">
                        <div class="comment-header">
                            <span class="comment-author">${currentUser.nombre_usuario}</span>
                            <span class="comment-date">Ahora mismo</span>
                        </div>
                        <p class="comment-text">${texto}</p>
                    </div>
                `;
                
                // Si hay un mensaje de "no hay comentarios", eliminarlo
                const noComments = commentsContainer.querySelector('.no-comments');
                if (noComments) {
                    commentsContainer.innerHTML = '';
                }
                
                // Insertar el nuevo comentario al principio de la lista
                commentsContainer.insertBefore(commentElement, commentsContainer.firstChild);
            } catch (error) {
                console.error('Error:', error);
                showError('No se pudo enviar el comentario');
                
                // Restaurar el botón en caso de error
                submitButton.disabled = false;
                submitButton.textContent = 'Comentar';
            }
        });
    }
    
    // Botones de like/dislike con funcionalidad actualizada
    const likeButton = document.getElementById('btn-like');
    const dislikeButton = document.getElementById('btn-dislike');
    
    likeButton.addEventListener('click', async () => {
        if (!currentUser) {
            showError('Inicia sesión para dar like');
            return;
        }
        
        // Si el botón ya está activo, quitamos el like
        if (likeButton.classList.contains('active')) {
            await removeLikeDislike();
        } else {
            // Si no, añadimos el like y quitamos el dislike si lo hubiera
            await addLikeDislike(true);
            if (dislikeButton.classList.contains('active')) {
                dislikeButton.classList.remove('active');
            }
        }
        
        // Actualizamos el contador de likes
        loadLikesCount();
    });
    
    dislikeButton.addEventListener('click', async () => {
        if (!currentUser) {
            showError('Inicia sesión para dar dislike');
            return;
        }
        
        // Si el botón ya está activo, quitamos el dislike
        if (dislikeButton.classList.contains('active')) {
            await removeLikeDislike();
        } else {
            // Si no, añadimos el dislike y quitamos el like si lo hubiera
            await addLikeDislike(false);
            if (likeButton.classList.contains('active')) {
                likeButton.classList.remove('active');
            }
        }
        
        // Actualizamos el contador de dislikes
        loadLikesCount();
    });

    // Botón de suscribirse con funcionalidad actualizada
    const subscribeBtn = document.getElementById('btn-subscribe');
    
    subscribeBtn.addEventListener('click', async () => {
        if (!currentUser) {
            showError('Inicia sesión para suscribirte');
            return;
        }
        
        // No permitir suscribirse a sí mismo
        if (currentUser.id_usuario === videoData.id_usuario) {
            showError('No puedes suscribirte a ti mismo');
            return;
        }
        
        try {
            if (subscribeBtn.classList.contains('subscribed')) {
                // Cancelar suscripción
                await cancelSubscription();
            } else {
                // Crear suscripción
                await createSubscription();
            }
            
            // Actualizar contador de suscriptores
            loadSubscriberCount();
        } catch (error) {
            console.error('Error:', error);
            showError('Error al procesar tu suscripción');
        }
    });
    
// Botón de compartir
document.getElementById('btn-share').addEventListener('click', () => {
    // Copiar la URL al portapapeles
    const videoUrl = window.location.href;
    
    navigator.clipboard.writeText(videoUrl)
        .then(() => {
            // Reemplazamos alert por nuestro toast personalizado
            showToast('URL copiada al portapapeles');
        })
        .catch(err => {
            console.error('Error al copiar URL:', err);
            // Fallback para navegadores que no soportan clipboard API
            prompt('Copia esta URL para compartir el video:', videoUrl);
        });
});

// Función para crear y mostrar un toast
function showToast(message) {
    const toastContainer = document.getElementById('toast-container');

    // Crear el elemento para el mensaje
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;

    // Agregarlo al contenedor
    toastContainer.appendChild(toast);

    // Eliminarlo tras 3 segundos
    setTimeout(() => {
        toast.remove();
    }, 3000);
}


    
    // Botón de suscribirse
    document.getElementById('btn-subscribe').addEventListener('click', () => {
        if (!currentUser) {
            showError('Inicia sesión para suscribirte');
            return;
        }
        
        const button = document.getElementById('btn-subscribe');
        
        if (button.classList.contains('subscribed')) {
            button.classList.remove('subscribed');
            button.textContent = 'Suscribirse';
        } else {
            button.classList.add('subscribed');
            button.textContent = 'Suscrito';
        }
        
        // Aquí iría la lógica para gestionar la suscripción (en un sistema real)
    });
    
    /* Configurar evento de búsqueda
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    
    searchButton.addEventListener('click', () => {
        performSearch(searchInput.value);
    });
    
    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            performSearch(searchInput.value);
        }
    });*/
}

// Realizar búsqueda
function performSearch(query) {
    if (query.trim()) {
        window.location.href = `../index.html?buscar=${encodeURIComponent(query)}`;
    }
}

// Alternar estado de botón (para likes/dislikes)
function toggleButton(button) {
    if (button.classList.contains('active')) {
        button.classList.remove('active');
    } else {
        button.classList.add('active');
    }
}


// Cargar el estado de like/dislike del usuario actual
async function loadLikeStatus() {
    if (!currentUser || !videoId) return;
    
    try {
        const response = await fetch(`${API_URL}/likes/video/${videoId}/usuario/${currentUser.id_usuario}`);
        
        if (!response.ok) {
            throw new Error('Error al cargar estado de like');
        }
        
        const data = await response.json();
        
        const likeButton = document.getElementById('btn-like');
        const dislikeButton = document.getElementById('btn-dislike');
        
        // Resetear estado de los botones
        likeButton.classList.remove('active');
        dislikeButton.classList.remove('active');
        
        // Actualizar según el estado
        if (data.like === true) {
            likeButton.classList.add('active');
        } else if (data.like === false) {
            dislikeButton.classList.add('active');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Cargar la cantidad de likes y dislikes
async function loadLikesCount() {
    if (!videoId) return;
    
    try {
        const response = await fetch(`${API_URL}/likes/video/${videoId}/count`);
        
        if (!response.ok) {
            throw new Error('Error al cargar conteo de likes');
        }
        
        const data = await response.json();
        
        // Actualizar los contadores en la interfaz
        document.getElementById('like-count').textContent = data.likes;
        document.getElementById('dislike-count').textContent = data.dislikes;
    } catch (error) {
        console.error('Error:', error);
    }
}

// Añadir like o dislike
async function addLikeDislike(isLike) {
    if (!currentUser || !videoId) return;
    
    try {
        const response = await fetch(`${API_URL}/likes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id_usuario: currentUser.id_usuario,
                id_video: videoId,
                tipo: isLike
            })
        });
        
        if (!response.ok) {
            throw new Error('Error al dar like/dislike');
        }
        
        // Actualizar el estado del botón
        const button = isLike ? 
            document.getElementById('btn-like') : 
            document.getElementById('btn-dislike');
        
        button.classList.add('active');
    } catch (error) {
        console.error('Error:', error);
        showError('No se pudo procesar tu like/dislike');
    }
}

// Eliminar like o dislike
async function removeLikeDislike() {
    if (!currentUser || !videoId) return;
    
    try {
        const response = await fetch(`${API_URL}/likes/video/${videoId}/usuario/${currentUser.id_usuario}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Error al quitar like/dislike');
        }
        
        // Actualizar el estado de los botones
        document.getElementById('btn-like').classList.remove('active');
        document.getElementById('btn-dislike').classList.remove('active');
    } catch (error) {
        console.error('Error:', error);
        showError('No se pudo quitar tu like/dislike');
    }
}

// Cerrar sesión
function handleLogout(event) {
    event.preventDefault();
    
    // Eliminar datos del usuario de localStorage
    localStorage.removeItem('usuario');
    
    // Redireccionar al inicio
    window.location.href = '../index.html';
}

// Mostrar mensaje de error
function showError(message) {
    alert(message);
}

// Función personalizada para mostrar alertas mejoradas
function showCustomAlert(message, type = 'info') {
    // Crear el contenedor principal si no existe
    let alertContainer = document.getElementById('custom-alert-container');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'custom-alert-container';
        document.body.appendChild(alertContainer);
    }
    
    // Crear la alerta
    const alert = document.createElement('div');
    alert.className = `custom-alert ${type}`;
    
    // Icono según el tipo
    let icon = '';
    if (type === 'success') {
        icon = '✓';
    } else if (type === 'error') {
        icon = '✕';
    } else {
        icon = 'ℹ';
    }
    
    // Contenido de la alerta
    alert.innerHTML = `
        <div class="alert-icon">${icon}</div>
        <div class="alert-message">${message}</div>
        <button class="alert-close">×</button>
    `;
    
    // Añadir al contenedor
    alertContainer.appendChild(alert);
    
    // Configurar evento para cerrar
    const closeBtn = alert.querySelector('.alert-close');
    closeBtn.addEventListener('click', () => {
        alertContainer.removeChild(alert);
    });
    
    // Automáticamente cerrar después de 3 segundos
    setTimeout(() => {
        if (alertContainer.contains(alert)) {
            alertContainer.removeChild(alert);
        }
    }, 3000);
    
    return alert;
}

const ratingStyles = document.createElement('style');
ratingStyles.textContent = `
    .login-message {
        color: #666;
        font-size: 0.9rem;
        padding: 0.5rem 0;
    }
    
    .login-message a {
        color: #065fd4;
        text-decoration: none;
        font-weight: 500;
    }
    
    .login-message a:hover {
        text-decoration: underline;
    }
`;
document.head.appendChild(ratingStyles);

// Añadir estilos para las alertas
const alertStyles = document.createElement('style');
alertStyles.textContent = `
    #custom-alert-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
    }
    
    .custom-alert {
        display: flex;
        align-items: center;
        min-width: 300px;
        max-width: 400px;
        padding: 15px;
        margin-bottom: 10px;
        border-radius: 4px;
        background-color: white;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideIn 0.3s ease;
    }
    
    .custom-alert.success {
        border-left: 4px solid #4caf50;
    }
    
    .custom-alert.error {
        border-left: 4px solid #f44336;
    }
    
    .custom-alert.info {
        border-left: 4px solid #2196f3;
    }
    
    .alert-icon {
        font-size: 1.5rem;
        margin-right: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
    }
    
    .custom-alert.success .alert-icon {
        color: #4caf50;
    }
    
    .custom-alert.error .alert-icon {
        color: #f44336;
    }
    
    .custom-alert.info .alert-icon {
        color: #2196f3;
    }
    
    .alert-message {
        flex-grow: 1;
        font-size: 0.95rem;
        color: #333;
    }
    
    .alert-close {
        background: none;
        border: none;
        color: #888;
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0;
        margin-left: 10px;
    }
    
    .alert-close:hover {
        color: #333;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(alertStyles);