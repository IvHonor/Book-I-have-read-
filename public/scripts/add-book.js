const API_URL = "https://openlibrary.org/search.json?q=";
const COVERS_URL = "https://covers.openlibrary.org/b/id/";

const titleInput = document.getElementById("title_input");
const previewBox = document.getElementById("cover-preview"); // wrapper div
const previewImg = document.getElementById("cover_image");   // actual <img>
const suggestionsBox = document.getElementById("suggestions");

let debounceTimeout;

titleInput.addEventListener("input", () => {
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(searchBooks, 300);

  if (!titleInput.value.trim()) {
    previewImg.src = "";
    previewBox.style.display = "none";
    suggestionsBox.innerHTML = "";
  }
});

async function searchBooks() {
  const query = titleInput.value.trim();
  if (!query) {
    suggestionsBox.innerHTML = "";
    previewImg.src = "";
    previewBox.style.display = "none";
    return;
  }

  const response = await fetch(API_URL + encodeURIComponent(query));
  const data = await response.json();

  suggestionsBox.innerHTML = "";
  const docs = data.docs.slice(0, 5); // Top 5 results

  docs.forEach(book => {
    const title = book.title;
    const author = book.author_name ? ` - ${book.author_name[0]}` : "";
    const li = document.createElement("li");
    li.textContent = title + author;

    li.addEventListener("click", () => {
      titleInput.value = title;
      suggestionsBox.innerHTML = "";

      if (book.cover_i) {
        previewImg.src = `${COVERS_URL}${book.cover_i}-M.jpg`;
        previewBox.style.display = "block";
      } else {
        previewImg.src = "";
        previewBox.style.display = "none";
      }
    });

    suggestionsBox.appendChild(li);
  });

  if (docs[0]?.cover_i) {
    previewImg.src = `${COVERS_URL}${docs[0].cover_i}-M.jpg`;
    previewBox.style.display = "block";
  } else {
    previewImg.src = "";
    previewBox.style.display = "none";
  }
}

flatpickr("input[type='date']", {
  dateFormat: "d/m/Y",
  defaultDate: "today",
  altInput: true,
  altFormat: "F j, Y",
});
