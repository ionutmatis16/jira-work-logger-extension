function extractDataFromPage() {
    const jiraId = document.getElementById("key-val");
    if (!jiraId) {
        console.error('Could not find JIRA ID on the page (selector: key-val)');
        return null;
    }

    const internalId = jiraId.getAttribute("rel");
    if (!internalId) {
        console.error('Could not find internal ID on the page (selector: key-val');
        return null;
    }

    const atlTokenArray = document.getElementsByName("atl_token");
    if (!atlTokenArray || atlTokenArray.length === 0) {
        console.error('Could not find ATL token in dom response (selector: atl_token)');
        return null;
    }
    const atlToken = atlTokenArray[0].value;

    const jiraTaskTitle = document.getElementById("summary-val");
    if (!jiraTaskTitle || !jiraTaskTitle.textContent) {
        console.error('Could not find JIRA title on the page (selector: summary-val)');
        return null;
    }

    const jiraTaskId = jiraId.getAttribute("href");
    if (!jiraTaskId) {
        console.error('Could not find JIRA task ID on the page (selector: key-val)');
        return null;
    }

    return {
        internalId,
        atlToken,
        jiraTaskTitle: jiraTaskTitle.textContent.trim(),
        jiraTaskId};
}

function extractFormTokenFromHtml(html) {
    const formTokenArray = new DOMParser().parseFromString(html, 'text/html').getElementsByName("formToken");
    if (!formTokenArray || formTokenArray.length === 0) {
        console.error('Could not find form token in the HTML response (selector: formToken');
        return null;
    }

    return formTokenArray[0].value;
}

function getFormattedPastDate(pastHours) {
    const date = new Date();
    date.setHours(date.getHours() - pastHours);

    const options = {
        day: 'numeric',
        month: 'short',
        year: '2-digit',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };

    const formattedDate = new Intl.DateTimeFormat('en-US', options).format(date);

    // Replace spaces with '/' for the desired format
    return formattedDate.replace(/ /g, '/');
}
