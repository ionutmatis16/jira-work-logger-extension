document.getElementById('logTime').addEventListener('click', () => {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            function: extractDataFromPage
        }, (results) => {
            const result = document.getElementById("result");
            if (!result) {
                console.error('Could not find result element on the page (selector: result)');
                return;
            }

            if (!results || results.length === 0 || !results[0].result) {
                setError(result, 'Error in extracting data from the page');
                return;
            }

            const pageData = results[0].result;
            const internalId = pageData.internalId;
            const atlToken = pageData.atlToken;

            logTime(internalId, atlToken, result);
        });
    });
});

function logTime(internalId, atlToken, result) {
    const formData = getFormData(result);
    if (!formData) {
        return;
    } else {
        hideError(result);
    }

    const isDateRangeSelected = formData.isDataRangeSelected;
    if (isDateRangeSelected) {
        let currentDate = formData.startDate;
        const endDate = formData.endDate;

        while (currentDate <= endDate) {
            if (!isWeekend(currentDate)) {
                const formattedDate = formatDate(currentDate);
                logOneDay(internalId, atlToken, formData.timeLogged, formattedDate, formData.startHour, formData.comment);
            }
            const newDate = currentDate.setDate(currentDate.getDate() + 1);
            currentDate = new Date(newDate);
        }
    } else {
        const date = formatDate(formData.singleDate);
        logOneDay(internalId, atlToken, formData.timeLogged, date, formData.startHour, formData.comment);
    }
}

function logOneDay(internalId, atlToken, timeLogged, startDate, startHour, comment) {
    const result = document.getElementById("result");

    const currentEpochTime = Date.now();
    fetch(`https://jira.evozon.com/secure/CreateWorklog!default.jspa?id=${internalId}&decorator=dialog&inline=true&_=${currentEpochTime}`)
        .then(response => response.text())
        .then(html => {
            const formToken = extractFormTokenFromHtml(html);
            if (!formToken) {
                setError(result, 'Form token not found in HTML response');
                return;
            }

            setTimeout(() => {
                console.log('Waiting 0.5 seconds before sending the 2nd API call');
            }, 1500);

            fetch(`https://jira.evozon.com/secure/CreateWorklog.jspa`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                },
                body: new URLSearchParams({
                    'inline': 'true',
                    'decorator': 'dialog',
                    'worklogId': '',
                    'id': internalId,
                    'formToken': formToken,
                    'timeLogged': timeLogged,
                    'startDate': startDate + " " + startHour,
                    'adjustEstimate': 'auto',
                    'dnd-dropzone': '',
                    'comment': comment,
                    'commentLevel': '',
                    'atl_token': atlToken
                })
            }) // Replace with your API endpoint
                .then(response => response.text())
                .then(data => {
                    // Process the data from the 2nd API call
                    setResult(result, 'Time logged successfully for ' + startDate);
                    // Display the data in the popup or perform other actions
                })
                .catch(error => {
                    setError(result ,'Error in 2nd API call:', error);
                });

        })
        .catch(error => {
            setError(result, 'Error in 1st API call:', error);
        });
}

function setError(result, message) {
    result.innerHTML = message;
    result.classList.add('error');
}

function hideError(result) {
    result.classList.add("hidden");
}

function setResult(result, message) {
    result.innerHTML = message;
    result.classList.remove('error');
    result.classList.add('success');
    result.classList.add("shown");
}

function getParsedDate(date) {
    const parts = date.split("-");
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

function isWeekend(date) {
    const dayOfWeek = date.getDay();
    return (dayOfWeek === 6) || (dayOfWeek === 0);
}

function formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[date.getMonth()];
    const year = String(date.getFullYear()).slice(-2);

    return `${day}/${month}/${year}`;
}

function getFormData(result) {
    const timeLogged = document.getElementById('timeLogged').value;
    if (!timeLogged) {
        setError(result, 'Please enter the time logged');
        return null;
    }

    const startHour = document.getElementById('startHour').value;
    if (!startHour) {
        setError(result, 'Please enter the start hour');
        return null;
    }

    let singleDate;
    let startDate;
    let endDate;
    const isDataRangeSelected = document.getElementById("useDateRange").checked;
    if (isDataRangeSelected) {
        const startDateElement = document.getElementById('startDate');
        if (!startDateElement || !startDateElement.value) {
            setError(result, 'Please enter the start date');
            return null;
        }
        startDate = getParsedDate(startDateElement.value);

        const endDateElement = document.getElementById('endDate');
        if (!endDateElement || !endDateElement.value) {
            setError(result, 'Please enter the end date');
            return null;
        }
        endDate = getParsedDate(endDateElement.value);

        if (startDate.getTime() > endDate.getTime()) {
            setError(result, 'Start date should be before end date');
            return null;
        }
    } else {
        const singleDateElement = document.getElementById('singleDate');
        if (!singleDateElement || !singleDateElement.value) {
            setError(result, 'Please enter the date');
            return null;
        }
        singleDate = getParsedDate(singleDateElement.value);
    }

    const commentSelector = document.getElementById('comment');
    if (!commentSelector || !commentSelector.value) {
        setError(result, 'Please enter the comment');
        return null;
    }

    return {
        timeLogged,
        startHour,
        isDataRangeSelected,
        singleDate,
        startDate,
        endDate,
        comment: commentSelector.value
    };
}

document.addEventListener('DOMContentLoaded', function () {
    const result = document.getElementById("result");
    if (!result) {
        console.error('Could not find result element on the page (selector: result)');
        return;
    }

    setTabJiraTitle(result);
    configureToggle();
    setDefaultDates();
});

function setTabJiraTitle(result) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            function: extractDataFromPage
        }, (results) => {
            if (!results || results.length === 0 || !results[0].result) {
                setError(result, 'Error in extracting data from the page');
                return;
            }

            const pageData = results[0].result;
            const taskTitle = document.getElementsByClassName("j-task-title");
            if (!taskTitle || taskTitle.length === 0) {
                setError(result, 'Could not find task title element on the page (selector: j-task-title)');
                return;
            }

            taskTitle[0].innerHTML = pageData.jiraTaskTitle;
        })
    });
}

function configureToggle() {
    const useDateRangeToggle = document.getElementById("useDateRange");

    function toggleDateInputs() {
        if (useDateRangeToggle.checked) {
            document.getElementsByClassName("date-range-wrapper")[0].classList.add("shown");
            document.getElementsByClassName("date-range-wrapper")[0].classList.remove("hidden");
            document.getElementsByClassName("single-date-wrapper")[0].classList.add("hidden");
            document.getElementsByClassName("single-date-wrapper")[0].classList.remove("shown");
        } else {
            document.getElementsByClassName("date-range-wrapper")[0].classList.add("hidden");
            document.getElementsByClassName("date-range-wrapper")[0].classList.remove("shown");
            document.getElementsByClassName("single-date-wrapper")[0].classList.add("shown");
            document.getElementsByClassName("single-date-wrapper")[0].classList.remove("hidden");
        }
    }

    useDateRangeToggle.addEventListener('change', toggleDateInputs);
    toggleDateInputs();
}

function setDefaultDates() {
    const date = new Date();
    document.getElementById("singleDate").valueAsDate = date;
    document.getElementById("startDate").valueAsDate = date;
    document.getElementById("endDate").valueAsDate = date;
}