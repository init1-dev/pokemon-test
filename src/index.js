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
			//   abilities: data.abilities,
			//   moves: data.moves,
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
			// TODO agregar name e imagen
			<p><b>Name: </b>${pokemon.name}</p>
			<p><b>Image: </b>${pokemon.img}</p>
			<p><b>Height: </b>${pokemon.height}</p>
			<p><b>Weight: </b>${pokemon.weight}</p>
			<p><b>Types: </b>${pokemon.types.join(", ")}</p>			
    `);
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
function getRandomNumber(min, max) {
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
		})
		.catch((error) => {
			console.log("Error fetching data:", error.message);
		});
}

/**
 * funcion principal de render usando el campo de texto `searchValue`
 */

function renderItems() {
	let value = document.getElementById("searchValue").value;
	let splittedValues = value.split(",");
	renderArrayItems(splittedValues);
}

/**
 * funcion para limpiar el campo `searchValue`
 */

function clearSearchInput() {
	let searchInput = document.getElementById("searchValue");
	searchInput.value = "";
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

	SEARCH_BTN.addEventListener("click", renderItems);
	RANDOM_BTN.addEventListener("click", renderItems);
	CLEAR_BTN.addEventListener("click", clearSearchInput);
}

// hack for hackerearth, no dispara evento DOMContentLoaded or load
// setTimeout(()=>{
// 	init();
// }, 200)

document.addEventListener("DOMContentLoaded", init);
