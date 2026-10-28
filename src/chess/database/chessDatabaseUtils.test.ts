import { describe, expect, it } from "vitest";
import type { Opening } from "../types";
import type { DatabaseImportJob, SearchForm } from "./chessDatabaseTypes";
import {
  createDatabaseSearchRequest,
  databaseImportProgressPercent,
  formatDatabaseBytes,
  formatDatabaseElapsed,
} from "./chessDatabaseUtils";

function search(overrides: Partial<SearchForm> = {}): SearchForm {
  return {
    player: "",
    player2: "",
    colorAssignment: "any",
    fromYear: "",
    toYear: "",
    result: "",
    minElo: "",
    openingId: "",
    eco: "",
    ...overrides,
  };
}

function job(overrides: Partial<DatabaseImportJob> = {}): DatabaseImportJob {
  return {
    id: "1",
    fileName: "games.pgn",
    status: "RUNNING",
    phase: "READING_PGN",
    totalBytes: 100,
    bytesRead: 25,
    processedGames: 0,
    importedGames: 0,
    skippedGames: 0,
    totalPlies: 0,
    elapsedMillis: 0,
    message: null,
    ...overrides,
  };
}

describe("chess database utilities", () => {
  it("maps unrestricted player search to player/player2", () => {
    expect(createDatabaseSearchRequest(search({
      player: "Carlsen",
      player2: "Nepo",
      fromYear: "2020",
      minElo: "2700",
    }))).toEqual({
      player: "Carlsen",
      player2: "Nepo",
      white: null,
      black: null,
      fromYear: 2020,
      toYear: null,
      result: null,
      minElo: 2700,
      eco: null,
      openingStartingPositionId: null,
      openingMoves: [],
      limit: 200,
    });
  });

  it("maps fixed colors to white/black criteria", () => {
    expect(createDatabaseSearchRequest(search({
      player: "White Player",
      player2: "Black Player",
      colorAssignment: "player1White",
    }))).toMatchObject({
      player: null,
      player2: null,
      white: "White Player",
      black: "Black Player",
    });

    expect(createDatabaseSearchRequest(search({
      player: "Black Player",
      player2: "White Player",
      colorAssignment: "player1Black",
    }))).toMatchObject({
      white: "White Player",
      black: "Black Player",
    });
  });


  it("maps ECO and the selected opening line into search criteria", () => {
    const opening: Opening = {
      id: "najdorf",
      name: "Sicilian Defense, Najdorf",
      eco: "B90",
      startingPositionId: 518,
      initialFen: null,
      moves: ["e2e4", "c7c5", "g1f3", "d7d6"],
      sanMoves: ["e4", "c5", "Nf3", "d6"],
      position: "",
      sideToMove: "white",
      playable: true,
    };

    expect(createDatabaseSearchRequest(
      search({ openingId: opening.id, eco: " B9 " }),
      opening,
    )).toMatchObject({
      eco: "B9",
      openingStartingPositionId: 518,
      openingMoves: opening.moves,
    });
  });

  it("formats import progress and sizes", () => {
    expect(databaseImportProgressPercent(job())).toBe(25);
    expect(databaseImportProgressPercent(job({
      status: "COMPLETE",
      totalBytes: 0,
      bytesRead: 0,
    }))).toBe(100);
    expect(formatDatabaseBytes(1536)).toBe("1.5 KB");
    expect(formatDatabaseElapsed(3_661_000)).toBe("1:01:01");
  });
});
