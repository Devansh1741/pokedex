import React, { useEffect, useCallback } from "react";
import Wrapper from "../sections/Wrapper";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import axios from "axios";
import { pokemonRoute, pokemonTabs } from "../utils/Constants";
import { defaultImages, images } from "../utils/getPokemonImages";
import { extractColors } from "extract-colors";
import Description from "./pokemonPages/description";
import CapableMoves from "./pokemonPages/capableMoves";
import Location from "./pokemonPages/location";
import Evolution from "./pokemonPages/evolution";
import { setCurrentPokemon } from "../app/slices/PokemonSlice";

interface EvolutionDetail {
  min_level: number | undefined;
  trigger: {
    name: string;
    url: string;
  };
}

interface Species {
  name: string;
  url: string;
}

interface EvolutionChain {
  species: Species;
  evolves_to: EvolutionChain[];
  evolution_details: EvolutionDetail[];
}

interface EvolutionData {
  pokemon: Species;
  level: number;
}

function Pokemon() {
  const params = useParams();
  const dispatch = useAppDispatch();
  const {currentPokemonTab} = useAppSelector(({app}) => app);

  const getRecursiveEvolution = useCallback(
    (evolutionChain: EvolutionChain, level: number, evolutionData: EvolutionData[]) => {
      // console.log("Here", evolutionChain);
      if (!evolutionChain.evolves_to.length) {
        evolutionData.push({
          pokemon: {
            ...evolutionChain.species,
            url: evolutionChain.species.url.replace("pokemon-species", "pokemon"),
          },
          level,
        });
        return;
      }

      evolutionData.push({
        pokemon: {
          ...evolutionChain.species,
          url: evolutionChain.species.url.replace("pokemon-species", "pokemon"),
        },
        level,
      });

      evolutionChain.evolves_to.forEach((evolution) => {
        getRecursiveEvolution(evolution, level + 1, evolutionData);
      });
    },
    []
  );

  const getEvolutionData = useCallback(
    (evolutionChain: EvolutionChain): EvolutionData[] => {
      const evolutionData: EvolutionData[] = [];
      getRecursiveEvolution(evolutionChain, 1, evolutionData);
      return evolutionData;
    },
    [getRecursiveEvolution]
  );

  const getPokemonInfo = useCallback(
    async (image: string) => {
      const { data } = await axios.get(`${pokemonRoute}/${params.id}`);
      const { data: dataEncounters } = await axios.get(
        data.location_area_encounters
      );
      const {
        data: {
          evolution_chain: { url: evolutionURL },
        },
      } = await axios.get(data.species.url);
      const { data: evolutionData } = await axios.get(evolutionURL);
      // console.log("Evolution", evolutionData);
      // console.log("EvolutionUrl", evolutionURL);
      const encounters: string[] = [];
      dataEncounters.forEach((encounter: any) => {
        encounters.push(
          encounter.location_area.name.toUpperCase().split("-").join(" ")
        );
      });
      // console.log({ data });
      const pokemonAbilities: { abilities: string[]; moves: string[] } = {
        abilities: data.abilities.map(
          ({ ability }: { ability: { name: string } }) => ability.name
        ),
        moves: data.moves.map(
          ({ move }: { move: { name: string } }) => move.name
        ),
      };
      const evolution = getEvolutionData(evolutionData.chain);
      console.log("Evolution", evolution);
      const evolutionEntry = evolution.find(({ pokemon }) => pokemon.name === data.name);
      console.log("EvolutionEntry", evolutionEntry);
      const evolutionLevel = evolutionEntry ? evolutionEntry.level : 1; // Default to 1 if not found

      dispatch(setCurrentPokemon({
        id: data.id,
        name: data.name,
        types: data.types.map(
          ({ type: { name } }: { type: { name: string } }) => name
        ),
        image,
        stats: data.stats.map(
          ({
            stat,
            base_stat,
          }: {
            stat: { name: string };
            base_stat: number;
          }) => ({
            name: stat.name,
            value: base_stat,
          })
        ),
        encounters,
        evolutionLevel,
        evolution,
        pokemonAbilities,
      }));
    },
    [getEvolutionData, params.id, dispatch]
  );

  useEffect(() => {
    const imageElemet = document.createElement("img");
    // @ts-ignore
    imageElemet.src = images[params.id];
    if (!imageElemet.src) {
      // @ts-ignore
      imageElemet.src = defaultImages[params.id];
    }

    const options = {
      pixels: 10000,
      distance: 1,
      splitPower: 10,
      colorValidator: (red: number, green: number, blue: number, alpha = 255) =>
        alpha > 250,
      saturationDistance: 0.2,
      lightnessDistance: 0.2,
      hueDistance: 0.083333333,
    };

    const getColor = async () => {
      const color = await extractColors(imageElemet.src, options);
      const root = document.documentElement;
      root.style.setProperty("--accent-color", color[0].hex.split('"')[0]);
    };
    getColor();

    getPokemonInfo(imageElemet.src);
  }, [params, getPokemonInfo, dispatch]);

  return (
    
  <div>
    {currentPokemonTab === pokemonTabs.description && <Description />}
    {currentPokemonTab === pokemonTabs.evolution && <Evolution />}
    {currentPokemonTab === pokemonTabs.locations && <Location />}
    {currentPokemonTab === pokemonTabs.moves && <CapableMoves />}
  </div>
  );
}

export default Wrapper(Pokemon);


