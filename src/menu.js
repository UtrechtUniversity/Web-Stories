import {
    change,
    directAction,
    requestLocChange,
    player,
    refreshLocation,
    updateDebugStats,
    Inventory
} from "./main.js";
import {
    fadeIn,
    fadeOut,
    fadeTime,
    replaceById,
    addFeedback,
    clearFeedback
} from "./display.js";
import {advanceScene} from "./scene.js";
import {parse} from "./parse.js";
import {getObj, LocationList, Npc, NpcList, Obj, ObjList} from "./classes.js";
//import $ from "../lib/jquery-3.3.1.min.js";

let buttonQueue = [];
let invActive = false;
let menuActive = false;
let menuTitle = "none";
let menuTracker = [];
let menuTxtQueue = [];
let menuButtonQueue = [];
// menuLock is TRUE whenever the menu is animating in or out
let menuLock = false;
let useOnModeActive = false;
let useOnSource;
let buttonID = 1;

const capitalizeFirstLetter = function (text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
};

const clearButtonQueue = function () {
    buttonQueue = [];
};

const clearMenuQueue = function () {
    menuTxtQueue = [];
    menuButtonQueue = [];
};

const addToButtonQueue = function (
    buttonTxt, objID, type, customID, interaction
) {
    if (customID === undefined) {
        customID = "no";
    }

    if (interaction === undefined) {
        /* interactions are referenced by index number,
        hence the -1 when there is no interaction specified */
        interaction = -1;
    }

    buttonQueue.push([buttonTxt, objID, type, customID, interaction]);
};

const addToMenuButtonQueue = function (
    buttonTxt, objID, type, customID, interaction
) {
    if (customID === undefined) {
        customID = "no";
    }

    if (interaction === undefined) {
        /* interactions are referenced by index number,
        hence the -1 when there is no interaction specified */
        interaction = -1;
    }

    menuButtonQueue.push([buttonTxt, objID, type, customID, interaction]);
};

const addToMenuTextQueue = function (text) {
    menuTxtQueue.push(text);
};

const addToMenu = function (objID) {
    /* This function will take the actions from objects in the interaction menu,
    and add their actions to the list of buttons to be displayed. This way an
    Obj can contain other Obj's, and all their actions will be added to the
    list. */
    let objInfo = getObj(objID);
    let objRef = objInfo.ref;

    if (objRef.interactions.length > 0) {
        // interaction ID of -1 means 'no interaction'
        let id = 0;
        let takeFound = false;

        objRef.interactions.forEach(function (interaction) {
            /* Check if one of the interactions is 'take',
            because then only 'take' will be show. */
            if (interaction.type === "take" && interaction.activated) {
                takeFound = true;
                addToMenuButtonQueue(
                    interaction.button, objID, "interact", "no", id
                );
            }
            id += 1;
        });

        if (!takeFound) {
            id = 0;

            objRef.interactions.forEach(function (interaction) {
                if (
                    !(
                        interaction.type === "talk" &&
                        (
                            objRef.sceneQueue === undefined ||
                            objRef.sceneQueue.length <= 0 ||
                            player.inScene
                        )
                    ) &&
                    interaction.activated
                ) {
                    addToMenuButtonQueue(
                        interaction.button, objID, "interact", "no", id
                    );
                }
                id += 1;
            });
        }
    }
};

const setMenuTitle = function (newTitle) {
    if (typeof newTitle === "string") {
        menuTitle = newTitle;
    }
};

const outsideClickListener = function (event) {
    // Used for detecting a click outside the interaction menu
    if (!$(event.target).closest("#menu_container").length) {
        if (menuActive) {
            hideMenu();
        }
    }
};

const displayContent = function (customFadeTime, objID) {
    // This function displays everything inside the interaction menu

    // TRACKER CODE
    let found = false;
    let objInfo = getObj(objID);
    let closeFound = false;
    let interaction;
    let i = 0;
    let j = 0;

    // Add this object to the tracker list (if it wasn't on the list already)
    while (i < menuTracker.length) {

        if (menuTracker[i] === objID) {
            /* This object was already in the tracker.
            If this doesn't have the highest index number
            then we have to remove everything that comes
            after, because the back button has then been used. */
            found = true;
            let lastIndex = menuTracker.length - 1;

            if (i < lastIndex) {
                let nextIndex = i + 1;
                let amount = lastIndex - i;
                menuTracker.splice(nextIndex, amount);
            }
        }
        i += 1;
    }

    if (!found) {
        menuTracker.push(objID);
    }

    /* If one of the object's interactions is "close"
    then we don't want a Back-button, because we already
    get a Close button. */
    while (j < objInfo.ref.interactions.length) {

        interaction = objInfo.ref.interactions[j];

        if (interaction.type === "close") {
            closeFound = true;
            break;
        }

        j += 1;
    }

    // When there are multiple items in the tracker: provide a 'back' button
    if (menuTracker.length > 1) {

        /*
        We have to subtract "2" from the length instead of "1" to get the
        previous item, since index numbers start with "0".
        */
        let prevObjectIndex = menuTracker.length - 2;
        let prevObjID = menuTracker[prevObjectIndex];

        // Back button
        if (!closeFound) {
            if (prevObjID === player.inventory.name) {
                addToMenuButtonQueue(
                    "Back", prevObjID, "openInventory", "no", -1
                );
            } else {
                addToMenuButtonQueue(
                    "Back", prevObjID, "openMenu", "no", -1
                );
            }
        }
    }
    // END OF TRACKER CODE

    if (customFadeTime > 0) {
        // First do a fadeout
        fadeOut("menu_info", customFadeTime);
        fadeOut("menu_options", customFadeTime);
    }

    setTimeout(function () {
        // Remove previous buttons
        replaceById("menu_options", "", 0);

        // Display title
        replaceById("menu_title", menuTitle, 0);

        replaceById("menu_info", "", 0);

        // All content that was added to txtQueue
        menuTxtQueue.forEach(function (txt) {
            $("#menu_info").append("<p>" + parse(txt) + "</p>");
        });

        // Add close button to menuButtonQueue
        addToMenuButtonQueue("Close menu", "closeButton", "hideMenu");

        // Add all buttons from menuButtonQueue
        createButtons();

        updateDebugStats();

        if (customFadeTime > 0) {
            // Fade back in
            fadeIn("menu_info", customFadeTime);
            fadeIn("menu_options", customFadeTime);
        }

    }, customFadeTime);

};

const refreshMenu = function (objID) {

    // Function runs when a new item is clicked inside the menu
    displayContent((fadeTime / 4), objID);

};

const showMenu = function (objID) {

    menuActive = true;
    menuLock = true;
    clearFeedback(false, true);

    // Show menu
    displayContent(0, objID);

    $("#menu_container").removeClass("hide");

    // Timeout is necessary or else the animation won't work. No clue why.
    setTimeout(function () {
        $("#menu_container").addClass("animate");
        $("#container").addClass("blur");
    }, 50);

    setTimeout(function () {
        document.addEventListener("mouseup", outsideClickListener);
        menuLock = false;
    }, 500);

};

const hideMenu = function () {

    let objInfo;

    menuLock = true;
    document.removeEventListener("mouseup", outsideClickListener);
    $("#menu_container").removeClass("animate");
    $("#container").removeClass("blur");

    setTimeout(function () {
        menuLock = false;
        /* Menu might have been opened again during timeout, for example
        when player clicks inventory button when the menu is open */
        if (!menuActive) {
            $("#menu_container").addClass("hide");
        }
    // 200ms is the delay time for the animations in the stylesheet
    }, 200);

    if (invActive) {
        /* Inventory is active and will be closed, so we need to re-add the
        click listener that was removed in openInventory().
        Timeout is necessary, because somehow a click that is registered
        by the outsideClickListener will also count as a click that
        activates the freshly added click listener below (if the click was
        in the same spot as the inventory button) and will therefore relaunch
        the inventory. */
        invActive = false;
        setTimeout(function () {
            $("#invBtn").on("click", function () {
                openInventory();
            });
        }, 200);
    }

    // Automatically close everything that was opened
    // on deeper levels than the first
    if (menuTracker.length > 1) {
        let i = 1;
        while (i < menuTracker.length) {
            objInfo = getObj(menuTracker[i]);
            objInfo.ref.autoClose();
            i += 1;
        }
    }

    menuActive = false;
    menuTracker = [];

    updateDebugStats();

    /*
    Restore previous location, only if the menu
    was opened by openMenu(), because then the player.location
    is moved to the object, but don't do it when we are in a scene
    */
    if (player.inObject && !player.inScene) {
        // Refresh in locationNext, so that we
        // don't accidentally refresh into
        // "locScene" or an object
        player.leaveMenu(player.locationNext);
        updateDebugStats();
        refreshLocation();

    } else if (player.inObject && player.inScene) {
        // Leave menu, but retain "locScene"
        // as the location
        player.leaveMenu("locScene");
        updateDebugStats();
    }

};

const useOnMode = function (source) {
    // useOn-mode is when a player wants to use an object on another object
    useOnModeActive = true;
    useOnSource = source;

    // useOnMode will always be triggered from the interaction menu
    hideMenu();
    addFeedback("<a href=\"#\" id=\"cancelUseOn\">cancel</a> Use " + useOnSource + " on:", true, true);

};

const deactivateUseOnMode = function (refresh = false) {
    if (useOnModeActive) {
        useOnModeActive = false;
        clearFeedback(true, true);
        addFeedback("'Use on' cancelled");
        if (refresh) {
            refreshLocation();
        }
    }
};

const openMenu = function (objID) {

    let delay;
    let objInfo = getObj(objID);
    let objRef = objInfo.ref;

    if (menuLock) {
        delay = 250;
    } else {
        delay = 0;
    }

    /* This timeout is to prevent the menu from simultaneously
     opening and closing when the player clicks on something outside
    of the menu while the menu is open. The delay time of 250ms is slightly
    longer than the duration of the animation (200ms), which is used for
    delaying the hiding of the menu is hideMenu(), so this part will
    always run after a possible closing action of the menu has been
    completed. */
    setTimeout(function () {

        // Temporarily change location
        player.moveToMenu(objID);

        if (objRef !== undefined) {

            setMenuTitle(capitalizeFirstLetter(objRef.name));
            addToMenuTextQueue(objRef.descr);

            /*
            Only add the interaction button when there are indeed interactions.
            When interaction is TALK, only add it when there are scenes in the
            queue AND if the player is not in a scene already
            */
            addToMenu(objID);

            // Showmenu when menu isn't active, else just refresh
            if (menuActive) {
                refreshMenu(objID);
            } else {
                showMenu(objID);
            }
        }
    }, delay);

};

const openInventory = function () {

    let keyRef;
    let delay;
    let objID = player.inventory.name;
    let objRef = ObjList.get(objID);
    invActive = true;

    // Remove event handler for inventory button
    $("#invBtn").off();

    if (menuLock) {
        delay = 250;
    } else {
        delay = 0;
    }
    /* This timeout is to prevent the menu from simultaneously
    opening and closing when the player clicks on something outside
    of the menu while the menu is open. The delay time of 250ms is slightly
    longer than the duration of the animation (200ms), which is used for
    delaying the hiding of the menu is hideMenu(), so this part will
    always run after a possible closing action of the menu has been
    completed. */
    setTimeout(function () {

        // Temporarily change location
        player.moveToMenu(objID);

        setMenuTitle(capitalizeFirstLetter(objID));
        addToMenuTextQueue(objRef.descr);

        // add buttons
        Inventory.forEach(function (value, key, map) {
            /* value is a boolean: 'true' will show an item,
            'false' will hide an item */
            if (value) {
                keyRef = ObjList.get(key);
                addToMenuButtonQueue(
                    keyRef.name, keyRef.name, "openMenu", "no", -1
                );
            }
        });

        // Showmenu when menu isn't active, else just refresh
        if (menuActive) {
            refreshMenu(objID);
        } else {
            showMenu(objID);
        }

        // Cancel useOnMode if active
        if (useOnModeActive) {
            deactivateUseOnMode();
        }

    }, delay);
};

const createButtons = function () {
    /* This function takes everything from the buttonQueues and
    turns every item into a button with click event handler */
    let choiceDiv = "choices";
    let selectedQueue = buttonQueue;

    if (menuActive) {
        choiceDiv = "menu_options";
        selectedQueue = menuButtonQueue;
    }

    // Clear previous buttons
    replaceById(choiceDiv, "", 0);

    // Add all buttons from the queue
    selectedQueue.forEach(function (button) {

        let buttonTxt = button[0];
        let objID = button[1];
        let type = button[2];
        let customID = button[3];
        let interaction = button[4];
        let thisID;
        let btnClass = "std";
        let locRef;

        if (customID === "no" || typeof customID !== "string") {
            thisID = "btn" + buttonID;
        } else {
            thisID = customID;
        }

        buttonID += 1;

        // Look up the intended class for the buttons
        locRef = LocationList.get(player.locationNext);
        let locBtnClass = locRef.styling.buttonClass;

        if (
            locBtnClass !== undefined && typeof locBtnClass === "string" &&
            locBtnClass !== ""
        ) {
            btnClass = locBtnClass;
        }

        if (buttonTxt !== "inline_button") {
            // Regular menu buttons
            buttonTxt = capitalizeFirstLetter(buttonTxt);

            $("#" + choiceDiv).append("<li><button id=\"" + thisID + "\" class=\"" + btnClass + "\">" +
                buttonTxt + "</button></li>");
        } else {
            // Inline links
            if (
                useOnModeActive &&
                (type === "directAction" || type === "openMenu")
            ) {
                /* useOnMode only works on inline links, and only when these
                inline links are objects, which is the case when clicking them
                either performs a directAction or openMenu */
                type = "useOn";
            }
        }

        if (type === "changeLoc") {
            $("#" + thisID).click(function () {
                deactivateUseOnMode();
                requestLocChange(objID);
            });
        } else if (type === "advanceScene") {
            $("#" + thisID).one("click", function () {
                deactivateUseOnMode();
                advanceScene(objID);
            });
        } else if (type === "hideMenu") {
            $("#" + thisID).one("click", function () {
                deactivateUseOnMode();
                hideMenu();
            });
        } else if (type === "openMenu") {
            $("#" + thisID).click(function () {
                deactivateUseOnMode();
                openMenu(objID);
            });
        } else if (type === "openInventory") {
            $("#" + thisID).one("click", function () {
                deactivateUseOnMode();
                openInventory();
            });
        } else if (type === "interact") {
            $("#" + thisID).click(function () {
                deactivateUseOnMode();
                let objRef = ObjList.get(objID);

                if (objRef === undefined) {
                    objRef = NpcList.get(objID);
                }

                if (interaction >= 0) {
                    objRef.interact(interaction, false);
                }
            });
        } else if (type === "directAction") {
            $("#" + thisID).click(function () {
                deactivateUseOnMode();
                directAction(objID);
            });
        } else if (type === "directChange") {
            $("#" + thisID).click(function () {
                /* directChange comes from locationParse. objID contains
                a reference to the changeArray instead of the usual objID...*/
                deactivateUseOnMode();
                change(objID);
            });
        } else if (type === "refreshLoc") {
            $("#" + thisID).one("click", function () {
                deactivateUseOnMode();
                refreshLocation();
            });
        } else if (type === "useOn") {
            $("#" + thisID).one("click", function () {
                let objRef = ObjList.get(objID);

                if (objRef === undefined) {
                    objRef = NpcList.get(objID);
                }

                clearFeedback(true, true);
                objRef.receiveFromObj(useOnSource);
                useOnModeActive = false;
                refreshLocation();
            });
        }
    });

    // Empty queue
    if (menuActive) {
        clearMenuQueue();
    } else {
        clearButtonQueue();
    }

};

export default "loaded";
export {
    addToButtonQueue,
    addToMenuButtonQueue,
    addToMenuTextQueue,
    addToMenu,
    createButtons,
    deactivateUseOnMode,
    openInventory,
    openMenu,
    refreshMenu,
    menuActive,
    hideMenu,
    useOnMode,
    useOnModeActive,
    menuTracker
};