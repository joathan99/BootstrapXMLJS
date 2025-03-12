document.addEventListener("DOMContentLoaded", function () {
    const loadFeedButton = document.getElementById("load-feed");
    const rssUrlInput = document.getElementById("rss-url");
    const newsContainer = document.createElement("div");
    newsContainer.classList.add("container", "mt-4", "row");
    document.body.appendChild(newsContainer);
    const favNewsButton = document.getElementById("fav-news");
    const allNewsButton = document.getElementById("all-news");
    const searchTextInput = document.getElementById("search-text");
    const searchButton = document.getElementById("search-button");

    const paginationContainer = document.createElement("div");
    paginationContainer.classList.add("container", "mt-4", "text-center");
    paginationContainer.innerHTML = `
        <nav>
            <ul class="pagination justify-content-center">
                <li class="page-item disabled" id="prev-page"><a class="page-link" href="#">Anterior</a></li>
                <li class="page-item"><span class="page-link" id="current-page">1</span></li>
                <li class="page-item" id="next-page"><a class="page-link" href="#">Siguiente</a></li>
            </ul>
        </nav>
    `;
    document.body.appendChild(paginationContainer);

    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    let currentEntries = [];
    let currentPage = 1;
    const entriesPerPage = 10;

    loadFeedButton.addEventListener("click", function () {
        const url = rssUrlInput.value.trim();
        if (url === "") {
            alert("Por favor, ingresa una URL de feed ATOM o RSS.");
            return;
        }
        fetchFeed(url);
    });

    favNewsButton.addEventListener("click", function () {
        displayFavorites();
    });

    allNewsButton.addEventListener("click", function () {
        fetchFeed(rssUrlInput.value.trim());
    });

    searchButton.addEventListener("click", function () {
        const searchText = searchTextInput.value.trim().toLowerCase();
        if (searchText === "") {
            alert("Por favor, ingresa un texto para buscar.");
            return;
        }
        filterNewsByText(searchText);
    });

    document.getElementById("prev-page").addEventListener("click", function () {
        if (currentPage > 1) {
            currentPage--;
            updatePagination();
            displayPage();
        }
    });

    document.getElementById("next-page").addEventListener("click", function () {
        if (currentPage * entriesPerPage < currentEntries.length) {
            currentPage++;
            updatePagination();
            displayPage();
        }
    });

    function fetchFeed(url) {
        const proxyUrls = [
            `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
            `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
        ];
        tryFetch(proxyUrls, 0);
    }

    function tryFetch(proxyUrls, index) {
        if (index >= proxyUrls.length) {
            alert("Error al obtener el feed. Intenta con otra URL.");
            return;
        }
        
        fetch(proxyUrls[index])
            .then(response => {
                if (!response.ok) {
                    throw new Error("Error en la respuesta del servidor");
                }
                return response.json();
            })
            .then(data => {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(data.contents, "text/xml");
                console.log("XML Cargado:", xmlDoc);
                validateXML(xmlDoc) ? storeEntries(xmlDoc) : alert("El XML no es válido según el esquema ATOM.");
            })
            .catch(error => {
                console.error("Error en la carga del feed:", error);
                tryFetch(proxyUrls, index + 1);
            });
    }

    function validateXML(xmlDoc) {
        const hasTitle = xmlDoc.getElementsByTagName("title").length > 0;
        const hasEntries = xmlDoc.getElementsByTagName("entry").length > 0 || xmlDoc.getElementsByTagName("item").length > 0;
        return hasTitle && hasEntries;
    }

    function storeEntries(xmlDoc) {
        let entries = xmlDoc.getElementsByTagName("entry");
        if (entries.length === 0) {
            entries = xmlDoc.getElementsByTagName("item");
        }
        
        currentEntries = Array.from(entries);
        currentPage = 1;
        updatePagination();
        displayPage();
    }

    function displayPage() {
        newsContainer.innerHTML = "";
        const start = (currentPage - 1) * entriesPerPage;
        const end = start + entriesPerPage;
        const pageEntries = currentEntries.slice(start, end);
        
        pageEntries.forEach(entry => {
            const title = entry.getElementsByTagName("title")[0]?.textContent || "Sin título";
            const linkElement = entry.getElementsByTagName("link")[0];
            const link = linkElement?.getAttribute("href") || linkElement?.textContent || "#";
            const summary = entry.getElementsByTagName("summary")[0]?.textContent || 
                            entry.getElementsByTagName("description")[0]?.textContent || "Sin descripción";
            const published = entry.getElementsByTagName("published")[0]?.textContent || 
                              entry.getElementsByTagName("pubDate")[0]?.textContent || "Fecha desconocida";
            const imageUrl = entry.getElementsByTagName("media:thumbnail")[0]?.getAttribute("url") ||
                             entry.getElementsByTagName("enclosure")[0]?.getAttribute("url") ||
                             "https://via.placeholder.com/150";
            const isFavorite = favorites.includes(link);

            const card = document.createElement("div");
            card.classList.add("col-md-4");
            card.innerHTML = `
                <div class="card mb-3">
                    <img src="${imageUrl}" class="card-img-top" alt="Imagen de la noticia">
                    <div class="card-body">
                        <h5 class="card-title">${title}</h5>
                        <p class="card-text">${summary}</p>
                        <p class="card-text"><small class="text-muted">Publicado el: ${published}</small></p>
                        <a href="${link}" class="btn btn-primary" target="_blank">Leer más</a>
                        <button class="favorite-icon btn btn-link" data-favorite="${isFavorite}" data-link="${link}">${isFavorite ? '★' : '☆'}</button>
                    </div>
                </div>
            `;
            newsContainer.appendChild(card);
        });

        // Agregar eventos a los íconos de favoritos
        document.querySelectorAll('.favorite-icon').forEach(icon => {
            icon.addEventListener('click', function() {
                const link = this.getAttribute('data-link');
                const isFavorite = this.getAttribute('data-favorite') === 'true';
                this.setAttribute('data-favorite', !isFavorite);
                this.textContent = !isFavorite ? '★' : '☆';

                if (!isFavorite) {
                    favorites.push(link);
                } else {
                    favorites = favorites.filter(fav => fav !== link);
                }
                localStorage.setItem("favorites", JSON.stringify(favorites));
            });
        });
    }

    function displayFavorites() {
        newsContainer.innerHTML = "";
        const favoriteEntries = currentEntries.filter(entry => {
            const linkElement = entry.getElementsByTagName("link")[0];
            const link = linkElement?.getAttribute("href") || linkElement?.textContent || "#";
            return favorites.includes(link);
        });

        favoriteEntries.forEach(entry => {
            const title = entry.getElementsByTagName("title")[0]?.textContent || "Sin título";
            const linkElement = entry.getElementsByTagName("link")[0];
            const link = linkElement?.getAttribute("href") || linkElement?.textContent || "#";
            const summary = entry.getElementsByTagName("summary")[0]?.textContent || 
                            entry.getElementsByTagName("description")[0]?.textContent || "Sin descripción";
            const published = entry.getElementsByTagName("published")[0]?.textContent || 
                              entry.getElementsByTagName("pubDate")[0]?.textContent || "Fecha desconocida";
            const imageUrl = entry.getElementsByTagName("media:thumbnail")[0]?.getAttribute("url") ||
                             entry.getElementsByTagName("enclosure")[0]?.getAttribute("url") ||
                             "https://via.placeholder.com/150";

            const card = document.createElement("div");
            card.classList.add("col-md-4");
            card.innerHTML = `
                <div class="card mb-3">
                    <img src="${imageUrl}" class="card-img-top" alt="Imagen de la noticia">
                    <div class="card-body">
                        <h5 class="card-title">${title}</h5>
                        <p class="card-text">${summary}</p>
                        <p class="card-text"><small class="text-muted">Publicado el: ${published}</small></p>
                        <a href="${link}" class="btn btn-primary" target="_blank">Leer más</a>
                        <button class="favorite-icon btn btn-link" data-favorite="true" data-link="${link}">★</button>
                    </div>
                </div>
            `;
            newsContainer.appendChild(card);
        });
    }

    function filterNewsByText(searchText) {
        newsContainer.innerHTML = "";
        const filteredEntries = currentEntries.filter(entry => {
            const title = entry.getElementsByTagName("title")[0]?.textContent || "";
            const summary = entry.getElementsByTagName("summary")[0]?.textContent || 
                           entry.getElementsByTagName("description")[0]?.textContent || "";
            return title.toLowerCase().includes(searchText) || summary.toLowerCase().includes(searchText);
        });

        filteredEntries.forEach(entry => {
            const title = entry.getElementsByTagName("title")[0]?.textContent || "Sin título";
            const linkElement = entry.getElementsByTagName("link")[0];
            const link = linkElement?.getAttribute("href") || linkElement?.textContent || "#";
            const summary = entry.getElementsByTagName("summary")[0]?.textContent || 
                           entry.getElementsByTagName("description")[0]?.textContent || "Sin descripción";
            const published = entry.getElementsByTagName("published")[0]?.textContent || 
                              entry.getElementsByTagName("pubDate")[0]?.textContent || "Fecha desconocida";
            const imageUrl = entry.getElementsByTagName("media:thumbnail")[0]?.getAttribute("url") ||
                             entry.getElementsByTagName("enclosure")[0]?.getAttribute("url") ||
                             "https://via.placeholder.com/150";

            const card = document.createElement("div");
            card.classList.add("col-md-4");
            card.innerHTML = `
                <div class="card mb-3">
                    <img src="${imageUrl}" class="card-img-top" alt="Imagen de la noticia">
                    <div class="card-body">
                        <h5 class="card-title">${title}</h5>
                        <p class="card-text">${summary}</p>
                        <p class="card-text"><small class="text-muted">Publicado el: ${published}</small></p>
                        <a href="${link}" class="btn btn-primary" target="_blank">Leer más</a>
                        <button class="favorite-icon btn btn-link" data-favorite="${favorites.includes(link)}" data-link="${link}">${favorites.includes(link) ? '★' : '☆'}</button>
                    </div>
                </div>
            `;
            newsContainer.appendChild(card);
        });
    }

    function updatePagination() {
        document.getElementById("current-page").textContent = currentPage;
        document.getElementById("prev-page").classList.toggle("disabled", currentPage === 1);
        document.getElementById("next-page").classList.toggle("disabled", currentPage * entriesPerPage >= currentEntries.length);
    }
});