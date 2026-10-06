const campusList = [
  { id: 1, campusId: 1, name: "Main Campus (HQ)", code: "MAIN" },
  { id: 2, campusId: 2, name: "North Branch", code: "NORTH" },
  { id: 3, campusId: 3, name: "South Campus", code: "SOUTH" }
];

const boardsList = [
  { id: 1, name: "Board of Intermediate Education, Andhra Pradesh" },
  { id: 2, name: "Central Board of Secondary Education" },
  { id: 3, name: "Telangana Board of Intermediate Education" },
  { id: 4, name: "Council for the Indian School Certificate Examinations" }
];

function getCampusSafeKey(c) {
  return String(c.id || c.campusId || c.name || "");
}

function getBoardsForCampus(c) {
    if (c.id === 1) return [boardsList[0], boardsList[1]];
    if (c.id === 2) return [boardsList[0], boardsList[2]];
    if (c.id === 3) return [boardsList[1], boardsList[3]];
    return boardsList;
}

let values = {
  assignedCampuses: [],
  assignedCampusNames: [],
  assignedCampusIds: [],
  assignedBoards: [],
  assignedBoardIds: [],
  boards: [],
};

function setValues(updater) {
  if (typeof updater === 'function') {
    values = updater(values);
  } else {
    values = { ...values, ...updater };
  }
}

// Copy handleToggleCampus
const handleToggleCampus = (campusObj) => {
  setValues((prev) => {
    let currentAssigned = [];
    if (Array.isArray(prev.assignedCampuses) && prev.assignedCampuses.length > 0) {
      currentAssigned = [...prev.assignedCampuses];
    } else if (prev.campusId) {
      const match = campusList.find(c => String(c.id || c.campusId) === String(prev.campusId));
      currentAssigned = [match || { id: prev.campusId, name: prev.campusName }];
    } else {
      currentAssigned = campusList.length > 0 ? [campusList[0]] : [];
    }
    
    const targetKey = getCampusSafeKey(campusObj);
    const targetName = String(campusObj.name || campusObj.campusName || "").trim().toLowerCase();

    const existingIndex = currentAssigned.findIndex((c) => {
      const cKey = getCampusSafeKey(c);
      const cName = String(c.name || c.campusName || c.label || "").trim().toLowerCase();
      return (targetKey && cKey === targetKey) || (targetName && cName === targetName);
    });

    let nextCampuses = [...currentAssigned];
    if (existingIndex >= 0) {
      if (nextCampuses.length > 1) {
        nextCampuses.splice(existingIndex, 1);
      }
    } else {
      nextCampuses.push(campusObj);
    }

    const nextBoardsMap = new Map();
    nextCampuses.forEach((c) => {
      const fullCampusObj = campusList.find(
        (cl) => getCampusSafeKey(cl) === getCampusSafeKey(c) || String(cl.name || cl.campusName).toLowerCase() === String(c.name || c.campusName).toLowerCase()
      ) || c;
      const cBoards = getBoardsForCampus(fullCampusObj);
      cBoards.forEach((b) => {
        nextBoardsMap.set(String(b.name || b.boardName), b);
      });
    });

    let fallbackBoards = [];
    if (Array.isArray(prev.assignedBoards) && prev.assignedBoards.length > 0) {
      fallbackBoards = [...prev.assignedBoards];
    } else if (Array.isArray(prev.boards) && prev.boards.length > 0) {
      fallbackBoards = [...prev.boards];
    } else if (prev.boardName || prev.board) {
      fallbackBoards = [prev.boardName || prev.board];
    }

    const nextSelectedBoards = fallbackBoards.filter((bName) => nextBoardsMap.has(String(bName)));
    if (nextSelectedBoards.length === 0 && nextBoardsMap.size > 0) {
      const firstAvailableBoard = Array.from(nextBoardsMap.values())[0];
      nextSelectedBoards.push(firstAvailableBoard.name || firstAvailableBoard.boardName);
    }

    const nextAssignedBoardIds = new Set();
    nextCampuses.forEach((c) => {
      const fullCampusObj = campusList.find(
        (cl) => getCampusSafeKey(cl) === getCampusSafeKey(c) || String(cl.name || cl.campusName).toLowerCase() === String(c.name || c.campusName).toLowerCase()
      ) || c;
      const cBoards = getBoardsForCampus(fullCampusObj);
      cBoards.forEach((b) => {
        if (nextSelectedBoards.includes(String(b.name || b.boardName))) {
          const bId = b.id || b.boardId;
          if (bId) nextAssignedBoardIds.add(Number(bId));
        }
      });
    });

    const primaryCampus = nextCampuses[0] || {};
    const primaryBoardName = nextSelectedBoards[0] || "";
    const primaryBoardObj = nextBoardsMap.get(primaryBoardName) || boardsList.find(
      (b) => (b.name || b.boardName) === primaryBoardName
    );

    return {
      ...prev,
      assignedCampuses: nextCampuses,
      assignedCampusNames: nextCampuses.map((c) => c.name || c.campusName),
      assignedCampusIds: nextCampuses.map((c) => c.id || c.campusId).filter(Boolean).map(Number),
      campusId: primaryCampus.id || primaryCampus.campusId,
      campusName: primaryCampus.name || primaryCampus.campusName,
      campusCode: primaryCampus.code || primaryCampus.campusCode,
      assignedBoards: nextSelectedBoards,
      assignedBoardIds: Array.from(nextAssignedBoardIds),
      boards: nextSelectedBoards,
      board: primaryBoardName,
      boardName: primaryBoardName,
      boardCode: primaryBoardObj?.code || primaryBoardObj?.boardCode || "",
      boardId: primaryBoardObj?.id || primaryBoardObj?.boardId,
    };
  });
};

const handleToggleBoard = (boardObj) => {
  setValues((prev) => {
    const bName = String(boardObj.name || boardObj.boardName || boardObj.label || "").trim();
    
    let currentBoards = [];
    if (Array.isArray(prev.assignedBoards) && prev.assignedBoards.length > 0) {
      currentBoards = [...prev.assignedBoards];
    } else if (Array.isArray(prev.boards) && prev.boards.length > 0) {
      currentBoards = [...prev.boards];
    } else if (prev.boardName || prev.board) {
      currentBoards = [String(prev.boardName || prev.board).trim()];
    }

    let currentAssignedCampuses = [];
    if (Array.isArray(prev.assignedCampuses) && prev.assignedCampuses.length > 0) {
      currentAssignedCampuses = [...prev.assignedCampuses];
    } else if (prev.campusId) {
      const match = campusList.find(c => String(c.id || c.campusId) === String(prev.campusId));
      currentAssignedCampuses = [match || { id: prev.campusId, name: prev.campusName }];
    } else {
      currentAssignedCampuses = campusList.length > 0 ? [campusList[0]] : [];
    }
    
    if (currentBoards.length === 0) {
      const combinedMap = new Map();
      currentAssignedCampuses.forEach((c) => {
        const fullCampusObj = campusList.find(
          (cl) => getCampusSafeKey(cl) === getCampusSafeKey(c) || String(cl.name || cl.campusName).toLowerCase() === String(c.name || c.campusName).toLowerCase()
        ) || c;
        const cBoards = getBoardsForCampus(fullCampusObj);
        cBoards.forEach((b) => {
          const key = String(b.name || b.boardName);
          if (key) combinedMap.set(key, b);
        });
      });
      const availBoards = Array.from(combinedMap.values());
      if (availBoards.length > 0) {
        currentBoards.push(String(availBoards[0].name || availBoards[0].boardName));
      }
    }

    const isAlreadySelected = currentBoards.some(b => String(b).trim().toLowerCase() === bName.toLowerCase());

    let nextBoards = [...currentBoards];
    if (isAlreadySelected) {
      if (currentBoards.length > 1) {
        nextBoards = currentBoards.filter((b) => String(b).trim().toLowerCase() !== bName.toLowerCase());
      }
    } else {
      if (bName) nextBoards.push(bName);
    }

    const primaryBoardName = nextBoards[0] || "";
    const primaryBoardObj = boardsList.find(
      (b) => String(b.name || b.boardName).toLowerCase() === primaryBoardName.toLowerCase()
    );

    const nextAssignedBoardIds = nextBoards.map(nb => {
      const bMatch = boardsList.find(b => String(b.name || b.boardName).toLowerCase() === String(nb).toLowerCase());
      return bMatch ? Number(bMatch.id || bMatch.boardId) : null;
    }).filter(Boolean);

    return {
      ...prev,
      assignedBoards: nextBoards,
      assignedBoardIds: nextAssignedBoardIds,
      boards: nextBoards,
      board: primaryBoardName,
      boardName: primaryBoardName,
      boardCode: primaryBoardObj?.code || primaryBoardObj?.boardCode || prev.boardCode,
      boardId: primaryBoardObj?.id || primaryBoardObj?.boardId || prev.boardId,
    };
  });
};

console.log("Initial Values:", values.assignedCampuses.map(c => c.name));
handleToggleCampus(campusList[0]);
console.log("After Toggling Campus 1:", values.assignedCampuses.map(c => c.name));
handleToggleCampus(campusList[1]);
console.log("After Toggling Campus 2:", values.assignedCampuses.map(c => c.name));
handleToggleCampus(campusList[0]); // Should remove campus 1
console.log("After Toggling Campus 1 again (remove):", values.assignedCampuses.map(c => c.name));
handleToggleCampus(campusList[0]); // Add back
console.log("After Toggling Campus 1 again (add):", values.assignedCampuses.map(c => c.name));

console.log("\nBoards initially:", values.assignedBoards);
handleToggleBoard(boardsList[1]); 
console.log("After Toggling Board 2:", values.assignedBoards);
handleToggleBoard(boardsList[2]);
console.log("After Toggling Board 3:", values.assignedBoards);
handleToggleBoard(boardsList[1]); // Remove 2
console.log("After Toggling Board 2 (remove):", values.assignedBoards);
