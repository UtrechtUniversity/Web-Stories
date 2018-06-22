import {Location, LocationList} from "./classes.js";
import {deactivateUseOnMode, isMenuActive} from "./menu.js";

let bgSize = "contain";
let currentBg = "no_bg";
let currentBgClass = "std";
let currentContainerClass = "std";
let fadeTime = 1000;
let feedbackTime = 5000;
let feedbackQueue = [];
let topLayerActive = true;
let fullscreen = false;
let topLayer = {
    bgClass: "std",
    img: "no_bg"
};
let bottomLayer = {
    bgClass: "std",
    img: "no_bg"
};

// ========================= ANIMATION SYSTEM ========================= \\

const setFadeTime = function (newFadeTime) {
    if (
        typeof newFadeTime === "number" &&
        newFadeTime > 0 &&
        newFadeTime < 5000
    ) {
        fadeTime = newFadeTime;
    }
};

const fadeIn = function (id, thisFadeTime) {
    /*
    All this function does is a transition in jQuery.
    The reason for being a new function is that you
    might want to do animations in an alternative
    way (for example through CSS).
    In that case only fadeIn() and fadeOut() need
    to be rewritten.
    */
    if (thisFadeTime < 0 || thisFadeTime === undefined) {
        thisFadeTime = fadeTime;
    }
    let idTag = "#" + id;
    $(idTag).fadeTo(thisFadeTime, 1);
};

const fadeOut = function (id, thisFadeTime) {
    if (thisFadeTime < 0 || thisFadeTime === undefined) {
        thisFadeTime = fadeTime;
    }
    let idTag = "#" + id;
    $(idTag).fadeTo(thisFadeTime, 0);
};

// ========================= GENERAL ========================= \\

const changeContainerClass = function (locID) {
    /* This function changes the CSS class attached to #container
    whenever a new location has a different class, because
    of the ability to set custom classes in locations.js */
    let locRef = LocationList.get(locID);

    if (locRef instanceof Location) {
        let newClass = locRef.styling.containerClass;

        if (
            newClass === undefined || newClass === "" ||
            typeof newClass !== "string"
        ) {
            newClass = "std";
        }

        if (newClass !== currentContainerClass) {
            $("#container").removeClass(currentContainerClass);
            $("#container").addClass(newClass);
            $("#menu_container").removeClass(currentContainerClass);
            $("#menu_container").addClass(newClass);
            currentContainerClass = newClass;
        }
    }
};

const replaceById = function (id, content, thisFadeTime, locID = "none") {
    /* This function is used throughout the program to change the content
    of the HTML, with or without crossfades */
    if (thisFadeTime === undefined && thisFadeTime !== 0) {
        thisFadeTime = fadeTime;
    }

    if (locID === undefined || typeof locID !== "string") {
        locID = "none";
    }

    if (thisFadeTime > 0) {
    // Animation will play

    fadeOut(id, thisFadeTime);

    setTimeout(function () {
        // The actual replace
        $("#" + id).html(content);

        // Update container class during a location change
        if (locID !== "none") {
            changeContainerClass(locID);
        }
        // Fade in again
        fadeIn(id, thisFadeTime);
    }, thisFadeTime);

    } else {
        // No animation
        if (locID !== "none") {
            changeContainerClass(locID);
        }

        $("#" + id).html(content);
  }

};

const changeBg = function (newLocRef) {

    let newImg = newLocRef.locImg;
    let newClass = newLocRef.styling.bgClass;

    if (
        newClass === undefined || typeof newClass !== "string" ||
        newClass === ""
    ) {
        newClass = "std";
    }

    /* We need to determine whether to change background layers. This
    is the case if anything (class OR image) changes. We keep track
    of which classes and layers were previously on the layer
    that we're gonna take, because there might still be stuff (class
    or image) that needs to be removed. */
    if (newClass !== currentBgClass || newImg !== currentBg) {

        let bg_url;
        currentBg = newImg;

        if (newImg === "no_bg") {
            bg_url = "none";
        } else {
            bg_url = "story/images/" + newImg;
        }

        if (topLayerActive) {
            /*
            When the top layer is active, we need to replace the class and
            images on the lower layer, and then bring the opacity of the top
            layer to 0.
            */
            if (newClass !== bottomLayer.bgClass) {
                // class changed
                $("#bg_layer_bottom").removeClass(bottomLayer.bgClass);
                $("#bg_layer_bottom").addClass(newClass);
                // update bottomLayer
                bottomLayer.bgClass = newClass;
            }

            if (newImg !== bottomLayer.img) {
                // image changed
                if (bg_url === "none") {
                    $("#bg_layer_bottom").css("background", "none");
                    $("#bg_layer_bottom").css({"background-color" : ""});
                } else {
                    $("#bg_layer_bottom").css("background", "url('" + bg_url + "') top center no-repeat");

                    $("#bg_layer_bottom").css({"background-color" : ""});

                    $("#bg_layer_bottom").css("background-size", bgSize);
                }
                // update bottomLayer
                bottomLayer.img = newImg;
            }

            document.getElementById("bg_layer_top").style.opacity = 0;

            // Flip the switch
            topLayerActive = false;

        } else {
            /*
            When the top layer is not active, we need to replace the class and
            image from the top layer and fade that one in.
            */
            if (newClass !== topLayer.bgClass) {
                // class changed
                $("#bg_layer_top").removeClass(topLayer.bgClass);
                $("#bg_layer_top").addClass(newClass);
                // update topLayer
                topLayer.bgClass = newClass;
            }

            if (newImg !== topLayer.img) {
                // image changed
                if (bg_url === "none") {
                    $("#bg_layer_top").css("background", "none");
                    $("#bg_layer_top").css({"background-color" : ""});
                } else {
                    $("#bg_layer_top").css("background", "url('" + bg_url + "') top center no-repeat");

                    $("#bg_layer_top").css({"background-color" : ""});

                    $("#bg_layer_top").css("background-size", bgSize);
                }
                // update topLayer
                topLayer.img = newImg;
            }

            document.getElementById("bg_layer_top").style.opacity = 1;
            // Flip the switch
            topLayerActive = true;
        }

        // update
        currentBgClass = newClass;

        /*
        console.clear();
        console.log("Top layer img: " + topLayer.img);
        console.log("Top layer class: " + topLayer.bgClass);
        console.log("Bottom layer img: " + bottomLayer.img);
        console.log("Bottom layer class: " + bottomLayer.bgClass);
        console.log("Current img: " + currentBg);
        console.log("Current class: " + currentBgClass);
        */
    }
};

const setBgSize = function (newSize) {
    bgSize = newSize;
};

const addFeedback = function (feedback, persist = false, useOnMode = false) {

    let feedbackObj = {
        msg: feedback,
        persist: persist,
        useOnMode: useOnMode
    };

    if (
        feedback !== undefined &&
        typeof feedback === "string" &&
        feedback !== ""
    ) {
        /* If another item is being displayed: add this feedback to the
        feedbackQueue. This message will then automatically be shown once the
        other message finishes. Do not add to feedbackQueue if this message is
        in the queue already (to prevent many of the same messages from
        stacking, in case player clicks multiple times on something that fires
        the feedback) */
        if (feedbackQueue.length > 0) {
            let lastIndex = feedbackQueue.length -1;
            if (feedbackQueue[lastIndex].msg !== feedback) {
                feedbackQueue.push(feedbackObj);
            }
        } else {
            feedbackQueue.push(feedbackObj);
            showFeedback();
        }
    }
};

const showFeedback = function () {

    let id = "feedback";
    let feedback = feedbackQueue[0].msg;
    let persist = feedbackQueue[0].persist;
    let useOnMode = feedbackQueue[0].useOnMode;

    if (isMenuActive()) {
        id = "menu_" + id;
    }

    replaceById(id, feedback, 0);
    document.getElementById(id).style.opacity = 1;

    // Add cancel button when feedback shows the useOn message
    if (useOnMode) {
        $("#cancelUseOn").one("click", function () {
            deactivateUseOnMode(true);
        });
    }

    if (!persist) {
        setTimeout(function () {
            // Remove this message from queue
            feedbackQueue.splice(0, 1);

            if (feedbackQueue.length > 0) {
                // Display next message in queue
                showFeedback();
            } else {
                // Fade out
                document.getElementById(id).style.opacity = 0;
            }
        }, feedbackTime);
    }
};

const clearFeedback = function (clearMain, clearMenu) {
    // replaceById("feedback", "", 0);
    // replaceById("menu_feedback", "", 0);
    if (clearMain) {
        document.getElementById("feedback").style.opacity = 0;
    }

    if (clearMenu) {
        document.getElementById("menu_feedback").style.opacity = 0;
    }

    feedbackActive = false;
};

const compositFeedback = function (feedback) {
    // This function runs when we receive an array with multiple feedback-items
    let allFeedback = "";
    let anyFeedback = false;

    /* Add all feedback to one big string
    and add <br> after each except the last one */
    if (feedback.length > 0) {
        let i = 0;
        let failMsg;
        while (i < feedback.length) {
            failMsg = feedback[i];
            if (failMsg !== "no_msg") {
                anyFeedback = true;
                allFeedback += failMsg;
                if (i < (feedback.length - 1)) {
                    allFeedback += "<br>";
                }
            }
            i++;
        }
    }

    if (anyFeedback) {
        addFeedback(allFeedback);
    }

};

const setFeedbackTime = function (newFeedbackTime) {
    if (
        typeof newFeedbackTime === "number" && newFeedbackTime > 0 &&
        newFeedbackTime < 50000
    ) {
        feedbackTime = newFeedbackTime;
    }
};

const toggleFullscreen = function () {
    if (
        !fullscreen && (
        document.fullscreenEnabled || 
        document.webkitFullscreenEnabled || 
        document.mozFullScreenEnabled ||
        document.msFullscreenEnabled
        )
    ) {
        // ENTER fullscreen
        fullscreen = true;
        $("#fsBtn").removeClass("fs_enter");
        $("#fsBtn").addClass("fs_exit");
        let elem = document.querySelector("body");
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
            elem.mozRequestFullScreen();
        } else if (elem.msRequestFullscreen) {
            elem.msRequestFullscreen();
        }
    } else if (
        fullscreen && (
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
        )
    ) {
        // EXIT fullscreen
        fullscreen = false;
        $("#fsBtn").removeClass("fs_exit");
        $("#fsBtn").addClass("fs_enter");
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
};

export default "loaded";
export {
    fadeTime,
    changeBg,
    setBgSize,
    addFeedback,
    clearFeedback,
    changeContainerClass,
    compositFeedback,
    replaceById,
    setFeedbackTime,
    setFadeTime,
    fadeIn,
    fadeOut,
    toggleFullscreen
};