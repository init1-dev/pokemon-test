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
			name: data.name,
			img: data.sprites.front_default,
			height: data.height,
			weight: data.weight,
			types: data.types,
			abilities: data.abilities,
			moves: data.moves,
		};
	});
}

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
}

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
}

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
}

/**
 * Render de informacion del pokemon en el dom
 *
 * @param pokemon
 */
function renderPokemon(pokemon) {
	const List = document.getElementById("list");
	const pokemonLi = document.createElement("li");
	
	pokemon.notFound
		? (pokemonLi.innerHTML = `<h3>${pokemon.notFound}</h3>`)
		: (pokemonLi.innerHTML = `
			<div class="card">
				<p><b>Name: </b>${pokemon.name}</p>
				<img src="${pokemon.img}" />
				<p><b>Height: </b>${pokemon.height}kg</p>
				<p><b>Weight: </b>${pokemon.weight}cm</p>
				<p><b>Types: </b> <span class="type ${'type'}">${pokemon.types.join(", ")}</span></p>
				<p><b>Abilities: </b>${pokemon.abilities.join(", ")}</p>
				<p><b>Moves: </b>${pokemon.moves.join(", ")}</p>
			<div>
		`);
	List.appendChild(pokemonLi);
}

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
}

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
}

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
			setLoading(false);
		})
		.catch((error) => {
			console.log("Error fetching data:", error.message);
		});
}

/**
 * funcion para limpiar el campo `searchValue`
 */

function clearLastResults() {
	let listContent = document.getElementById("list");
	listContent.innerHTML = '';
}

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
}

/**
 * funcion para obtener valores separados por coma y limpiar vacíos
 */

function getCommaSeparatedValues(stringValues) {
	if(stringValues) {
		return stringValues.split(",").filter(val => val.trim() !== "");
	}
}

/**
 * funcion principal de render usando el campo de texto `searchValue`
 */

function renderItems({random = false, add = false} = {}) {
	setLoading(true);

	if(!add){
		clearLastResults();
	}

	if(random){
		const randomIds = getRandomNumber(1, 1302, 4);
		return renderArrayItems(randomIds);
	}

	let values = document.getElementById("searchValue").value;
	
	if(values) {
		let splittedValues = getCommaSeparatedValues(values);
		renderArrayItems(splittedValues);
	} else {
		setLoading(false);
	}
}

/**
 * funcion para resetear el formulario y limpiar resultados
 */

function resetFormAndClean() {
	let form = document.getElementById("pokemonForm");
	form.reset();
	toggleClearButton();
	clearLastResults();
}

/**
 * funcion que establece el focus en el input especificado
 */

function inputFocus(inputName) {
	if(inputName){
		document.getElementById(inputName).focus();
	}
}

/**
 * funcion que establece la visibilidad del botton clearButton
 */

function toggleClearButton() {
    const input = document.getElementById('searchValue');
    const clearButton = document.getElementById('clearButton');
    clearButton.style.display = input.value ? 'block' : 'none';
}

/**
 * funcion que limpia `searchValue`
 */

function clearInput() {
	const SEARCH_INPUT = document.getElementById('searchValue');
    SEARCH_INPUT.value = '';
    toggleClearButton();
	SEARCH_INPUT.focus();
}

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
}

document.addEventListener("DOMContentLoaded", init);