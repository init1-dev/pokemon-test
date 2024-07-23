/**
 * obtiene un pokemon
 *
 * @param id
 * @returns {Promise<{abilities: *, types: *, img: *, moves: *, name: *, weight: *, height: *}>}
 */
function getPokemon(id) {
	const url = `https://pokeapi.co/api/v2/pokemon/${id}`;
	return fetchData(url).then((data) => {
		if (!data) return;
		return {
			id: data.id,
			name: data.name,
			front: data.sprites.front_default,
			shiny: data.sprites.front_shiny,
			height: data.height,
			weight: data.weight,
			types: data.types,
			abilities: data.abilities,
			moves: data.moves,
		};
	});
};

/**
 * Obtener tipos del pokemon enviado
 *
 * @param pokemon
 * @returns {Promise<Awaited<unknown>[]>}
 */

function getPokemonTypes(pokemon) {
	const typesPromises = pokemon.types.map(async (type) => {
		const url = type.type.url;
		return fetchData(url).then((data) => {
			// TODO buscar el elemento (idioma) "es" en lo que retorna
			return data.names.find((name) => name.language.name === "es").name;
		});
	});
	return Promise.all(typesPromises);
};

/**
 * obtener habilidades del pokemon enviado
 * @param pokemon
 * @returns {Promise<Awaited<unknown>[]>}
 */
function getPokemonAbilities(pokemon) {
	const abilitiesPromises = pokemon.abilities.map(async (ability) => {
		const url = ability.ability.url;

		return fetchData(url).then((data) => {
			return data.names.find((name) => name.language.name === "es").name;
		});
	});

	return Promise.all(abilitiesPromises);
};

/**
 * Obtener movimientos del pokemon enviado
 *
 * @param pokemon
 * @returns {Promise<Awaited<unknown>[]>}
 */

function getPokemonMoves(pokemon) {
	const movesPromises = pokemon.moves.map( async(move) => {
		const url = move.move.url;
		return fetchData(url).then((data) => {
			// TODO buscar el elemento (idioma) "es" en lo que retorna. Si no existe, buscar el elemento (idioma) "en"
			return data.names.find((name) => name.language.name === "es").name;
		});
	});

	// Dividir las solicitudes en lotes de 10 porque hay pokemons con mas de 100 movimientos
	const batchSize = 10; // Número máximo de solicitudes simultáneas
	const batches = []; // Array de solicitudes divididas en lotes
	for (let i = 0; i < movesPromises.length; i += batchSize) {
		batches.push(movesPromises.slice(i, i + batchSize));
	}

	return batches
		.reduce((chain, batch) => {
			return chain.then((results) => {
				return Promise.allSettled(batch).then((batchResults) => {
					return results.concat(batchResults);
				});
			});
		}, Promise.resolve([]))
		.then((results) => {
			const moves = results.map((result) => {
				if (result.status === "fulfilled") {
					return result.value;
				} else {
					return "Nombre no encontrado";
				}
			});

			return moves;
		});
};

/**
 * Render de informacion del pokemon en el dom
 *
 * @param pokemon
 */
function renderPokemon(pokemon) {
	const List = document.getElementById("list");
	const pokemonLi = document.createElement("li");
	console.log(pokemon);
	pokemon.notFound
		? (pokemonLi.innerHTML = `<h3>${pokemon.notFound}</h3>`)
		: (pokemonLi.innerHTML = `
			<div class="card">
				<div class="card-front">
					<h2 class="stat-name"><b> #${pokemon.id} ${pokemon.name}</b></h2>
					<span>Normal form:</span>
					<img src="${pokemon.front}" alt="imagen de ${pokemon.name}"/>
					<span>Shiny form:</span>
					<img src="${pokemon.shiny}" alt="imagen de ${pokemon.name}"/>
				</div>

				<div class="card-back interactive">
					<p><b>Name: </b>${pokemon.name}</p>
					<p><b>Height: </b>${pokemon.height}kg</p>
					<p><b>Weight: </b>${pokemon.weight}cm</p>
					<p><b>Types: </b> <span class="type ${'type'}">${pokemon.types.join(", ")}</span></p>
					<p><b>Abilities: </b>${pokemon.abilities.join(", ")}</p>
					<p><b>Moves: </b>${pokemon.moves.join(", ")}</p>
				</div>
			<div>
		`);
	List.appendChild(pokemonLi);
};

/**
 * Se recomienda el uso de esta utilidad en vez de fetch directo
 *
 * @param url
 * @returns {Promise<any>}
 */
async function fetchData(url) {
	return fetch(url)
		.then((response) => response.json())
		.catch((error) => {
			console.log(`Error fetching data: ${error}`);
			throw error;
		});
};

/**
 * Función para obtener enteros randoms basado en un rango de numeros
 *
 * @param min
 * @param max
 * @returns {*}
 */
function getRandomNumber(min, max, number) {
	if(number){
		const uniqueNumbers = new Set();

		while (uniqueNumbers.size < number) {
			const randomNumber = Math.floor(Math.random() * (max - min + 1) + min);
			uniqueNumbers.add(randomNumber);
		}
		return Array.from(uniqueNumbers);
	}
	return Math.floor(Math.random() * (max - min + 1) + min);
};

/**
 * Funcion de renders de items enviados por parametros (array de ids)
 *
 * @param ids
 */
function renderArrayItems(ids) {
	// validacion de id sin asignar
	if (!ids) {
		return;
	}

	// validacion de que sea un array
	if (!Array.isArray(ids)) {
		console.log("Does not a valid array");
		return;
	}

	// iteracion por cada id enviado
	const pokemonPromises = ids.map((id) =>
		getPokemon(id)
			.then(async (response) => {
				if (response.name) {
					response.types = await getPokemonTypes(response);
					response.abilities = await getPokemonAbilities(response);
					response.moves = await getPokemonMoves(response);
					return response;
				} else {
					throw new Error(`Pokemon with ID ${id} not found`);
				}
			})
			.catch((error) => {
				// TODO ante error o no found saldra por aqui
				// TODO retornar un objeto con notFound con na string que diga cual es el pokemon no encontrado
				return { notFound: `Pokemon with ID ${id} not found`, error: error.message };
			})
	);

	Promise.all(pokemonPromises)
		.then((pokemons) => {
			pokemons.forEach((pokemon) => renderPokemon(pokemon));
			cardEvents();
			setLoading(false);
		})
		.catch((error) => {
			console.log("Error fetching data:", error.message);
		});
};

/**
 * funcion para limpiar el campo `searchValue`
 */

function clearLastResults() {
	let listContent = document.getElementById("list");
	listContent.innerHTML = '';
};

/**
 * funcion para establecer el estado de loading
 */

function setLoading(value) {
	const loader = document.getElementById('loader');
	if(value){
		loader.classList.add('visible');
	} else {
		loader.classList.remove('visible');
	}
};

/**
 * funcion para obtener valores separados por coma y limpiar vacíos
 */

function getCommaSeparatedValues(stringValues) {
	if(stringValues) {
		return stringValues.split(",").filter(val => val.trim() !== "");
	}
};

/**
 * funcion principal de render usando el campo de texto `searchValue`
 */

function renderItems({random = false, add = false} = {}) {
	let values = document.getElementById("searchValue").value;

	if(!random && !values.length > 0) return;
	
	toggleExplain();
	setLoading(true);

	if(!add){
		clearLastResults();
	}

	if(random){
		const randomIds = getRandomNumber(1, 1302, 4);
		return renderArrayItems(randomIds);
	}
	
	let splittedValues = getCommaSeparatedValues(values);
	renderArrayItems(splittedValues);
};

/**
 * funcion para resetear el formulario y limpiar resultados
 */

function resetFormAndClean() {
	let form = document.getElementById("pokemonForm");
	form.reset();
	toggleClearButton();
	clearLastResults();
	toggleExplain(true);
};

/**
 * funcion que establece el focus en el input especificado
 */

function inputFocus(inputName) {
	if(inputName){
		document.getElementById(inputName).focus();
	}
};

/**
 * funcion que establece la visibilidad del botton clearButton
 */

function toggleClearButton() {
    const input = document.getElementById('searchValue');
    const clearButton = document.getElementById('clearButton');
    clearButton.style.display = input.value ? 'block' : 'none';
};

/**
 * funcion que limpia `searchValue`
 */

function clearInput() {
	const SEARCH_INPUT = document.getElementById('searchValue');
    SEARCH_INPUT.value = '';
    toggleClearButton();
	SEARCH_INPUT.focus();
};

/**
 * alterna entre la explicacion y la lista de resultados
 */

function toggleExplain(reset = false) {
	const RESULTS = document.getElementById('results');
	const EXPLAIN = document.getElementById('explain');

	if(reset){
		RESULTS.classList.add('hidden');
		EXPLAIN.classList.remove('hidden');
	} else {
		RESULTS.classList.remove('hidden');
		EXPLAIN.classList.add('hidden');
	}
};

/**
 * eventos de las cartas
 */

function cardEvents() {
	const card = document.querySelectorAll('.card');

	card.forEach((card) => {
		card.addEventListener('mousemove', function(e) {
			if (!card.classList.contains('flipped')) {
				const xAxis = (card.clientWidth / 2 - e.offsetX) / 10;
				const yAxis = (card.clientHeight / 2 - e.offsetY) / 10;
				card.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
			}
		});
	
		card.addEventListener('mouseenter', function() {
			if (!card.classList.contains('flipped')) {
				card.style.transition = 'none';
			}
		});
	
		card.addEventListener('mouseleave', function() {
			if (!card.classList.contains('flipped')) {
				card.style.transition = 'transform 0.8s';
				card.style.transform = 'rotateY(0deg) rotateX(0deg)';
			}
		});
	
		// Rotacion
		card.addEventListener('click', function() {
			card.classList.toggle('flipped');
			if (card.classList.contains('flipped')) {
				card.style.transition = 'transform 0.8s';
				card.style.transform = 'rotateY(180deg)';
			} else {
				card.style.transition = 'transform 0.8s';
				card.style.transform = 'rotateY(0deg)';
			}
		});
	})
};

/**
 * iniciacion de app
 *
 * agregar el evento `click` a los botones usando `addEventListener`
 */
function init() {
	const SEARCH_INPUT = document.getElementById("searchValue");
	const SEARCH_BTN = document.getElementById("search");
	const CLEAN_BTN = document.getElementById("clearButton");
	const ADD_BTN = document.getElementById("add");
	const RANDOM_BTN = document.getElementById("random");
	const CLEAR_BTN = document.getElementById("clear");
	const FORM = document.getElementById("pokemonForm");

	inputFocus("searchValue");
	toggleClearButton();

	SEARCH_INPUT.addEventListener("input", toggleClearButton);
	SEARCH_INPUT.addEventListener("keydown", (e) => {
		if(e.key === 'Escape') {
			clearInput();
		} else if(e.key === 'Enter' && e.shiftKey) {
			e.preventDefault();
			renderItems({random: false, add: true});
		} else if(e.key === 'Enter') {
			e.preventDefault();
			renderItems();
		} else if(e.ctrlKey && e.key === 'x') {
			e.preventDefault();
			resetFormAndClean();
		}
	})

	SEARCH_BTN.addEventListener("click", () => renderItems());
	CLEAN_BTN.addEventListener("click", clearInput);
	ADD_BTN.addEventListener("click", () => renderItems({random: false, add: true}));
	RANDOM_BTN.addEventListener("click", () => renderItems({random: true}));
	CLEAR_BTN.addEventListener("click", resetFormAndClean);

	FORM.addEventListener("submit", (e) => {
		e.preventDefault();
		renderItems();
	});
};

document.addEventListener("DOMContentLoaded", init);