import {
    addToButtonQueue,
    addToMenuButtonQueue,
    addToMenu,
    isMenuActive,
    useOnModeActive
} from "./menu.js";
import {NpcList, ObjList} from "./classes.js";
import {checkConditions} from "./main.js";

let inlineID = 1;
let customID;

const parse = function (txt) {
/* This parse function detects and replaces both Location-Link macro's and
Interaction macro's. Consequence & condition areas within location sections
are parsed with parseLocation() below. */

    let found = false;
    let noLocs = false;
    let noInters = false;
    let directAction;
    let mStart;
    let mEnd;
    let mLength;
    let macro;
    let replacement;
    let param1 = {
        buttonTxt: "none",
        strt: 0,
        end: 0,
        lngth: 0
    };
    let param2 = {
        objID: "none",
        strt: 0,
        end: 0,
        lngth: 0
    };

    do {

        found = false;

        if (!noLocs){

            /* STEP 1: DETECT LOCATION MACRO'S
                [[param1->param2]]
                param1 = displayed text
                param2 = Location object
            */

            // See if there are opening and closing brackets
            mStart = txt.search(/\[{2}/);
            mEnd = txt.search(/\]{2}/) + 2;

            /* Check if there are both opening and closing brackets, and if the
            closing brackets come AFTER the opening brackets */
            if (((mStart > -1) && (mEnd > 1)) && (mEnd > mStart)) {

                /* Location macro brackets found
                Isolate everything between the brackets, so that nothing
                outside of it is accidentally found */
                mLength = mEnd - mStart;
                macro = txt.substr(mStart, mLength);

                // Detect if the arrow (->) is found
                param1.end = macro.search(/->/);

                if (param1.end > -1) {
                    // Macro is complete!
                    found = true;

                    param2.strt = param1.end + 2; // moves position after '->'
                    param1.lngth = param1.end - 2;
                    param2.end = macro.search(/\]{2}/);
                    param2.lngth = param2.end - param2.strt;

                    // Pulling the parameters from the macro's
                    param1.buttonTxt = macro.substr(2, param1.lngth);
                    param2.objID = macro.substr(param2.strt, param2.lngth);

                    if (isMenuActive()) {
                        // add its properties to the current menu
                        addToMenuButtonQueue(param1.buttonTxt,
                        param2.objID, "changeLoc", "no", -1);
                    } else {
                        addToButtonQueue(param1.buttonTxt,
                        param2.objID, "changeLoc", "no", -1);
                    }

                    txt = txt.replace(macro,"");

                } else {
                    noLocs = true;
                }
            } else {
                noLocs = true;
            }
        }

        if (!noInters) {

            directAction = false;

            /* STEP 2: DETECT INTERACTION MACRO'S
                {{!param1->param2}}
                param1 = displayed text
                param2 = IObject
                ! is optional and means DIRECT ACTION
                (skips the interaction menu) */

            // Detecting if there are opening and closing brackets
            mStart = txt.search(/\{{2}/);
            mEnd = txt.search(/\}{2}/) + 2;

            /* Check if there are both opening and closing brackets, and if the
            closing brackets come AFTER the opening brackets */
            if (((mStart > -1) && (mEnd > 1)) && (mEnd > mStart)) {

                found = true;

                /* Isolate everything between the brackets, so that nothing
                outside of it is accidentally found */
                mLength = mEnd - mStart;
                macro = txt.substr(mStart, mLength);
                param1.strt = 2;

                // Check if it starts with ! (that's at position 2)
                if (macro.search(/\!/) === 2) {
                    directAction = true;
                    param1.strt += 1;
                 }

                // Detect if the arrow (->) is found (OPTIONAL)
                param1.end = macro.search(/->/);

                if (param1.end === -1 || param1.end === undefined) {
                    param1.end = macro.search(/\}{2}/);
                    param1.lngth = param1.end - param1.strt;
                    param2.objID = macro.substr(param1.strt, param1.lngth);
                } else {
                    param2.strt = param1.end + 2; // moves position after '->'
                    param2.end = macro.search(/\}{2}/);
                    param2.lngth = param2.end - param2.strt;
                    param2.objID = macro.substr(param2.strt, param2.lngth);
                }

                param1.lngth = param1.end - param1.strt;
                param1.buttonTxt = macro.substr(param1.strt, param1.lngth);

                /* If the interactive menu is open:
                add object properties to menu */
                if (isMenuActive()) {

                    let objRef = ObjList.get(param2.objID);
                    let npcRef = NpcList.get(param2.objID);

                    // Check if it's an Obj or Npc, and get a reference
                    if (npcRef !== undefined) {
                        objRef = npcRef;
                    }

                    if (objRef !== undefined) {

                        /* Only display the text and buttons for this object if
                        it's not in player inventory) */
                        if (objRef.loc !== "player") {
                            replacement = param1.buttonTxt;
                            addToMenu(param2.objID);
                        } else {
                            // Object is in player inventory, display nothing
                            replacement = "";
                        }
                    }
                } else {
                    // When the menu is not active:
                    // add regular buttons

                    customID = "inlBtn" + inlineID;
                    inlineID += 1;

                    if (useOnModeActive) {
                        replacement = "<a href=\"#\" id=" + customID +
                        " class=\"useOn\">" + param1.buttonTxt + "</a>";
                    } else {
                        replacement = "<a href=\"#\" id=" + customID +
                        ">" + param1.buttonTxt + "</a>";
                    }

                    if (directAction) {
                        addToButtonQueue("inline_button", param2.objID,
                        "directAction", customID, -1);
                    } else {
                        addToButtonQueue("inline_button", param2.objID,
                        "openMenu", customID, -1);
                    }
                }
                txt = txt.replace(macro, replacement);
            } else {
                // Interaction Macro start and end brackets not found
                noInters = true;
            }
        }
    }
    while (found);

    return txt;
};

const parseLocation = function (content) {
    let parsedContent = [];

    content.forEach(function (section) {
        let macroCond;
        let macroConseq;
        let mStart;
        let mEnd;
        let mLength;
        let sectionContent = section.sectionHTML;
        let condArea;
        let conseqArea;
        let entireSection = false;
        let entireSectionReplaced = false;

        /* 1. If conditions are defined: look for condition macro and show
        or hide it depending on whether the conditions are met.
        If conditions are defined but no condition macro is present,
        then the conditions will apply to the entire section.
        Condition macro's are defined by double brackets:
            ((This text will only be shown when conditions are met))
        */
        if (section.conditions.length > 0) {
            // 1.A Look for condition macro
            mStart = sectionContent.search(/\({2}/);
            mEnd = sectionContent.search(/\){2}/);

            if (((mStart > -1) && mEnd > 1) && (mEnd > mStart)) {
                // Condition macro found!
                // Include closing brackets in macro
                mEnd += 2;
                mLength = mEnd - mStart;
                macroCond = sectionContent.substr(mStart, mLength);
                // Exclude opening & closing brackets for the replacement
                mStart += 2;
                mEnd -= 2;
                mLength = mEnd - mStart;
                condArea = sectionContent.substr(mStart, mLength);
            } else {
                // No condition macro found; entire section applies
                condArea = sectionContent;
                macroCond = sectionContent;
                entireSection = true;
            }

            // 1.B Check if conditions are met. If not: remove it
            if (checkConditions(section.conditions)) {
                /* Conditions are met. Macro is replaced, so the brackets aren't
                shown */
                sectionContent = sectionContent.replace(macroCond, condArea);
            } else {
                sectionContent = sectionContent.replace(macroCond, "");
                // Check if there's a fallback specified
                if (entireSection) {

                    entireSectionReplaced = true;

                    if (
                        section.fallback !== undefined &&
                        section.fallback !== ""
                    ) {
                        sectionContent = section.fallback;
                    }
                }
            }
        }

        /* 2. If consequences are defined: decide consequence range
        and create a link for these consequences.
        If no macro is present then the entire section will be
        used. Consequence macro's are defined like this:
            ({This text will get a link to activate consequences})
        If a fallback was used for the content of this section
        (this is an option when an entire section doesn't meet the
        conditions) then consequences shouldn't apply.
        */
        if (section.consequences.length > 0 && !entireSectionReplaced) {
            mStart = -1;
            mEnd = -1;
            // 2.A Look for consequence macro
            mStart = sectionContent.search(/\(\{/);
            mEnd = sectionContent.search(/\}\)/);

            if (((mStart > -1) && mEnd > 1) && (mEnd > mStart)) {
                // Consequence macro found!
                // Include closing brackets in macro
                mEnd += 2;
                mLength = mEnd - mStart;
                macroConseq = sectionContent.substr(mStart, mLength);
                // Exclude opening & closing brackets for the replacement
                mStart += 2;
                mEnd -= 2;
                mLength = mEnd - mStart;
                conseqArea = sectionContent.substr(mStart, mLength);
            } else {
                // No consequence macro found: mark entire section
                conseqArea = sectionContent;
                macroConseq = sectionContent;
            }

            /* 2.B Make link, unless conseqArea is empty (f.e. when an
            entire section was a condition that isn't met, or when a
            condition macro was surrounded by a conseq macro and the
            condition isn't met */
            if (conseqArea.length > 0) {
                customID = "inlBtn" + inlineID;
                inlineID += 1;
    
                let linkedConseqArea = "<a href=\"#\" id=" + customID + ">" +
                conseqArea + "</a>";
    
                // 2.C Replace consequence area with linked version
                sectionContent = sectionContent.replace(
                    macroConseq, linkedConseqArea
                );
    
                // 2.D Add to button queue
                addToButtonQueue(
                    "inline_button",
                    section.consequences,
                    "directChange",
                    customID, -1
                );
            }
        }

        // run it through parse()
        sectionContent = parse(sectionContent);

        let sectionDelay = 0;

        if (
            section.delay !== undefined &&
            typeof section.delay === "number" &&
            section.delay > 0
        ) {
            sectionDelay = section.delay;
        }

        let sectionObject = {
            sectionHTML: sectionContent,
            delay: sectionDelay
        };

        // Add this section's content to parsedContent
        parsedContent.push(sectionObject);
    });

    return parsedContent;
};

export default "loaded";
export {parse, parseLocation};