/**
 * obtiene un pokemon
 *
 * @param id
 * @returns {Promise<{abilities: *, types: *, img: *, moves: *, name: *, weight: *, height: *}>}
 */
function getPokemon(id) {
	const url = `https://pokeapi.co/api/v2/pokemon/${id}`;
	return fetchData(url).then(async (data) => {
		if (!data) return;
		return {
			name: data.name,
			img: data.sprites.front_default,
			height: data.height,
			weight: data.weight,
			types: await getPokemonTypes(data),
			// abilities: await getPokemonAbilities(data),
			// moves: await getPokemonMoves(data),
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
			return data.names.find((name) => name.language.name === "es");
		});
	});

	pokemon.abilities = [];
	return Promise.all(abilitiesPromises).then((abilities) => {
		pokemon.abilities.push(abilities);
		return pokemon;
	});
}

/**
 * Obtener movimientos del pokemon enviado
 *
 * @param pokemon
 * @returns {Promise<Awaited<unknown>[]>}
 */

function getPokemonMoves(pokemon) {
	const movesPromises = pokemon.moves.map((move) => {
		const url = move.move.url;
		return fetchData(url).then((data) => {
			// TODO buscar el elemento (idioma) "es" en lo que retorna. Si no existe, buscar el elemento (idioma) "en"
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
			pokemon.moves = results.map((result) => {
				if (result.status === "fulfilled") {
					return result.value;
				} else {
					return "Nombre no encontrado";
				}
			});

			return pokemon;
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
			<div>
		`);
			// <p><b>Types: </b>${pokemon.abilities.join(", ")}</p>			
			// <p><b>Types: </b>${pokemon.moves.join(", ")}</p>
	List.appendChild(pokemonLi);
}

/**
 * Se recomienda el uso de esta utilidad en vez de fetch directo
 *
 * @param url
 * @returns {Promise<any>}
 */
function fetchData(url) {
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
		let randomNumbers = [];
		for (let index = 0; index < 4; index++) {
			randomNumbers.push(Math.floor(Math.random() * (max - min + 1) + min));
		}
		return randomNumbers;
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
			.then((response) => {
				if (response.name) {
					return response;
				} else {
					throw new Error(`Pokemon with ID ${id} not found`);
				}
			})
			.catch((error) => {
				console.error(error);
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
	console.log(listContent);
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
 * funcion principal de render usando el campo de texto `searchValue`
 */

function renderItems(random = false) {
	setLoading(true);
	clearLastResults()

	if(random){
		const randomIds = getRandomNumber(1, 1302, 4);
		console.log(randomIds);
		return renderArrayItems(randomIds);
	}

	let value = document.getElementById("searchValue").value;
	let splittedValues = value.split(",");
	renderArrayItems(splittedValues);
}

/**
 * funcion para limpiar el campo `searchValue`
 */

function clearSearchInput() {
	let form = document.getElementById("pokemonForm");
	let list = document.getElementById("list");
	form.reset();
	list.innerHTML = "";
}

/**
 * iniciacion de app
 *
 * agregar el evento `click` a los botones usando `addEventListener`
 */
function init() {
	const SEARCH_BTN = document.getElementById("search");
	const RANDOM_BTN = document.getElementById("random");
	const CLEAR_BTN = document.getElementById("clear");
	const FORM = document.getElementById("pokemonForm");

	SEARCH_BTN.addEventListener("click", () => renderItems());
	RANDOM_BTN.addEventListener("click", () => renderItems(true));
	CLEAR_BTN.addEventListener("click", clearSearchInput);
	FORM.addEventListener("submit", (e) => {
		e.preventDefault();
		renderItems();
	});
}

document.addEventListener("DOMContentLoaded", init);
