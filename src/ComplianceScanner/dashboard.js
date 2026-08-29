/* ============================================================
   AZURE COMPLIANCE MONITOR
   Dashboard JavaScript
   ============================================================ */


/* ============================================================
   API ENDPOINTS
   ============================================================ */

const API = {

    dashboard:
        "/api/dashboard",

    dashboardData:
        "/api/dashboard-data",

    latestReport:
        "/api/report/latest",

    scan:
        "/api/scan"

};


/* ============================================================
   GLOBAL STATE
   ============================================================ */

let allResults = [];

let filteredResults = [];

let currentPage = 1;

const pageSize = 10;


/* ============================================================
   DOM HELPER
   ============================================================ */

function $(id) {

    return document.getElementById(id);

}


/* ============================================================
   API CALL
   ============================================================ */

async function callApi(
    url,
    options = {}
) {

    const response = await fetch(
        url,
        {
            ...options,

            headers: {
                "Accept":
                    "application/json",

                ...(options.headers || {})
            }
        }
    );


    const text =
        await response.text();


    let data;


    try {

        data =
            text
                ? JSON.parse(text)
                : {};

    }

    catch {

        data = {
            raw: text
        };

    }


    if (!response.ok) {

        throw new Error(
            `${response.status} ${response.statusText}`
        );

    }


    return data;

}


/* ============================================================
   STATUS MESSAGE
   ============================================================ */

function showMessage(
    message,
    type = "success"
) {

    const element =
        $("statusMessage");


    element.textContent =
        message;


    element.className =
        `status-message ${type}`;

}


function hideMessage() {

    $("statusMessage")
        .className =
        "status-message hidden";

}


/* ============================================================
   EXTRACT ARRAY FROM API
   ============================================================ */

function extractResults(data) {

    if (Array.isArray(data)) {

        return data;

    }


    if (!data) {

        return [];

    }


    const possibleKeys = [

        "results",

        "data",

        "items",

        "records",

        "resources",

        "complianceResults",

        "complianceResults"

    ];


    for (
        const key of possibleKeys
    ) {

        if (
            Array.isArray(data[key])
        ) {

            return data[key];

        }

    }


    return [];

}


/* ============================================================
   GET VALUE
   ============================================================ */

function getValue(
    object,
    ...keys
) {

    if (!object) {

        return "";

    }


    for (
        const key of keys
    ) {

        if (
            object[key] !== undefined &&
            object[key] !== null
        ) {

            return object[key];

        }

    }


    return "";

}


/* ============================================================
   COMPLIANCE CHECK
   ============================================================ */

function checkCompliant(item) {

    const value =
        getValue(
            item,

            "isCompliant",

            "compliant",

            "complianceStatus",

            "status"
        );


    if (
        typeof value ===
        "boolean"
    ) {

        return value;

    }


    const text =
        String(value)
            .toLowerCase();


    return (
        text === "compliant" ||
        text === "true"
    );

}


/* ============================================================
   LOAD DASHBOARD
   ============================================================ */

async function loadDashboard() {

    hideMessage();


    try {

        let data;


        /*
         * First try latest report.
         */

        try {

            data =
                await callApi(
                    API.latestReport
                );

        }

        catch {

            /*
             * Fallback to dashboard-data
             */

            data =
                await callApi(
                    API.dashboardData
                );

        }


        allResults =
            extractResults(data);


        filteredResults =
            [...allResults];


        currentPage = 1;


        /*
         * Store raw response
         */

        $("rawResponse")
            .textContent =
            JSON.stringify(
                data,
                null,
                2
            );


        /*
         * Update dashboard
         */

        updateSummary(
            allResults,
            data
        );


        populateTypeFilter(
            allResults
        );


        renderTable();


        renderCharts(
            allResults
        );


        const now =
            new Date();


        const formatted =
            now.toLocaleString();


        $("lastUpdatedSidebar")
            .textContent =
            formatted;


        $("latestScanTime")
            .textContent =
            formatted;


    }

    catch (error) {

        console.error(
            "Dashboard error:",
            error
        );


        showMessage(
            "Unable to load compliance data: " +
            error.message,
            "error"
        );


        $("resultsBody")
            .innerHTML = `
                <tr>
                    <td colspan="8"
                        class="loading">
                        Unable to load compliance results.
                    </td>
                </tr>
            `;

    }

}


/* ============================================================
   UPDATE SUMMARY CARDS
   ============================================================ */

function updateSummary(
    results,
    data
) {

    const total =
        results.length;


    let compliant = 0;


    let nonCompliant = 0;


    let actionRequired = 0;


    results.forEach(
        item => {

            const status =
                String(
                    getValue(
                        item,
                        "status",
                        "complianceStatus"
                    )
                ).toLowerCase();


            if (
                checkCompliant(item)
            ) {

                compliant++;

            }

            else if (
                status.includes(
                    "action"
                )
            ) {

                actionRequired++;

            }

            else {

                nonCompliant++;

            }

        }
    );


    /*
     * If API itself returns summary,
     * use it when available.
     */

    const apiTotal =
        Number(
            getValue(
                data,
                "total",
                "totalResources",
                "resourcesScanned"
            )
        );


    const finalTotal =
        apiTotal ||
        total;


    $("totalResources")
        .textContent =
        finalTotal;


    $("compliantResources")
        .textContent =
        compliant;


    $("nonCompliantResources")
        .textContent =
        nonCompliant;


    $("actionRequired")
        .textContent =
        actionRequired;


    const complianceRate =
        finalTotal
            ? (
                compliant /
                finalTotal
            ) * 100
            : 0;


    const rounded =
        complianceRate.toFixed(1);


    $("complianceRate")
        .textContent =
        rounded + "%";


    $("compliantPercentage")
        .textContent =
        `${rounded}% of total`;


    $("nonCompliantPercentage")
        .textContent =
        finalTotal
            ? `${(
                nonCompliant /
                finalTotal *
                100
            ).toFixed(1)}% of total`
            : "0% of total";


    /*
     * Update circle
     */

    const circumference =
        251;


    const offset =
        circumference -
        (
            circumference *
            complianceRate /
            100
        );


    $("complianceCircle")
        .style.strokeDashoffset =
        offset;


    $("resourceChartTotal")
        .textContent =
        finalTotal;

}


/* ============================================================
   POPULATE RESOURCE TYPE FILTER
   ============================================================ */

function populateTypeFilter(
    results
) {

    const select =
        $("typeFilter");


    const types =
        new Set();


    results.forEach(
        item => {

            const type =
                getValue(
                    item,
                    "resourceType",
                    "type"
                );


            if (type) {

                types.add(type);

            }

        }
    );


    select.innerHTML = `
        <option value="all">
            All Types
        </option>
    `;


    [...types]
        .sort()
        .forEach(
            type => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    type;


                option.textContent =
                    type;


                select.appendChild(
                    option
                );

            }
        );

}


/* ============================================================
   FILTER RESULTS
   ============================================================ */

function filterResults() {

    const search =
        $("searchInput")
            .value
            .toLowerCase()
            .trim();


    const type =
        $("typeFilter")
            .value;


    const status =
        $("statusFilter")
            .value;


    filteredResults =
        allResults.filter(
            item => {

                const name =
                    String(
                        getValue(
                            item,
                            "resourceName",
                            "name"
                        )
                    ).toLowerCase();


                const resourceType =
                    String(
                        getValue(
                            item,
                            "resourceType",
                            "type"
                        )
                    );


                const itemStatus =
                    String(
                        getValue(
                            item,
                            "status",
                            "complianceStatus"
                        )
                    ).toLowerCase();


                const matchesSearch =
                    !search ||
                    name.includes(search) ||
                    resourceType
                        .toLowerCase()
                        .includes(search);


                const matchesType =
                    type === "all" ||
                    resourceType === type;


                let matchesStatus =
                    true;


                if (
                    status ===
                    "compliant"
                ) {

                    matchesStatus =
                        checkCompliant(
                            item
                        );

                }


                if (
                    status ===
                    "noncompliant"
                ) {

                    matchesStatus =
                        !checkCompliant(
                            item
                        );

                }


                return (
                    matchesSearch &&
                    matchesType &&
                    matchesStatus
                );

            }
        );


    currentPage = 1;


    renderTable();

}


/* ============================================================
   RENDER TABLE
   ============================================================ */

function renderTable() {

    const body =
        $("resultsBody");


    if (
        filteredResults.length ===
        0
    ) {

        body.innerHTML = `
            <tr>
                <td colspan="8"
                    class="loading">
                    No compliance results found.
                </td>
            </tr>
        `;


        $("paginationInfo")
            .textContent =
            "Showing 0 results";


        return;

    }


    const start =
        (
            currentPage -
            1
        ) * pageSize;


    const end =
        start +
        pageSize;


    const pageResults =
        filteredResults.slice(
            start,
            end
        );


    body.innerHTML =
        pageResults
            .map(
                createRow
            )
            .join("");


    const total =
        filteredResults.length;


    $("paginationInfo")
        .textContent =
        `Showing ${
            start + 1
        }-${
            Math.min(
                end,
                total
            )
        } of ${
            total
        } results`;


    $("currentPage")
        .textContent =
        currentPage;

}


/* ============================================================
   CREATE TABLE ROW
   ============================================================ */

function createRow(
    item
) {

    const resourceName =
        getValue(
            item,
            "resourceName",
            "name"
        ) ||
        "Unknown";


    const resourceId =
        getValue(
            item,
            "resourceId",
            "id"
        );


    const resourceType =
        getValue(
            item,
            "resourceType",
            "type"
        ) ||
        "—";


    const resourceGroup =
        getValue(
            item,
            "resourceGroup",
            "resourceGroupName",
            "group"
        ) ||
        "—";


    const rule =
        getValue(
            item,
            "ruleName",
            "ruleId",
            "propertyName",
            "rule",
            "property"
        ) ||
        "—";


    const currentValue =
        getValue(
            item,
            "currentValue",
            "actualValue",
            "value"
        );


    const message =
        getValue(
            item,
            "message",
            "reason",
            "description"
        ) ||
        "—";


    const timestamp =
        getValue(
            item,
            "timestamp",
            "time",
            "createdAt",
            "date"
        );


    const status =
        getValue(
            item,
            "status",
            "complianceStatus"
        );


    const compliant =
        checkCompliant(
            item
        );


    let statusClass =
        "status-noncompliant";


    let statusText =
        status ||
        "Non-Compliant";


    if (compliant) {

        statusClass =
            "status-compliant";

        statusText =
            "Compliant";

    }

    else if (
        String(status)
            .toLowerCase()
            .includes(
                "action"
            )
    ) {

        statusClass =
            "status-action";

        statusText =
            "Action Required";

    }


    return `

        <tr>

            <td>

                <div
                    class="resource-name">

                    ${escapeHtml(
                        resourceName
                    )}

                </div>


                ${
                    resourceId
                        ? `
                        <div
                            class="resource-id">

                            ${escapeHtml(
                                resourceId
                            )}

                        </div>
                        `
                        : ""
                }

            </td>


            <td>

                ${escapeHtml(
                    resourceType
                )}

            </td>


            <td>

                ${escapeHtml(
                    resourceGroup
                )}

            </td>


            <td>

                ${escapeHtml(
                    rule
                )}

            </td>


            <td>

                ${escapeHtml(
                    formatValue(
                        currentValue
                    )
                )}

            </td>


            <td>

                <span
                    class="status-badge
                    ${statusClass}">

                    ${escapeHtml(
                        statusText
                    )}

                </span>

            </td>


            <td>

                ${escapeHtml(
                    message
                )}

            </td>


            <td>

                ${timestamp
                    ? escapeHtml(
                        formatDate(
                            timestamp
                        )
                    )
                    : "—"
                }

            </td>

        </tr>

    `;

}


/* ============================================================
   CHARTS
   ============================================================ */

let trendChart;

let resourceChart;


function renderCharts(
    results
) {

    renderTrendChart(
        results
    );


    renderResourceChart(
        results
    );

}


/* ============================================================
   TREND CHART
   ============================================================ */

function renderTrendChart(
    results
) {

    const ctx =
        $("trendChart");


    if (trendChart) {

        trendChart.destroy();

    }


    /*
     * For now we create a
     * simple current distribution.
     *
     * Later we can connect this
     * to historical scan API.
     */

    const compliant =
        results.filter(
            checkCompliant
        ).length;


    const nonCompliant =
        results.length -
        compliant;


    trendChart =
        new Chart(
            ctx,
            {

                type: "line",

                data: {

                    labels: [
                        "Current Scan"
                    ],

                    datasets: [

                        {

                            label:
                                "Compliant",

                            data: [
                                compliant
                            ],

                            borderColor:
                                "#35d66f",

                            backgroundColor:
                                "rgba(53,214,111,.1)",

                            tension: .35,

                            fill: true

                        },

                        {

                            label:
                                "Non-Compliant",

                            data: [
                                nonCompliant
                            ],

                            borderColor:
                                "#ff4d4d",

                            backgroundColor:
                                "rgba(255,77,77,.1)",

                            tension: .35,

                            fill: true

                        }

                    ]

                },


                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {
                            display: false
                        }

                    },

                    scales: {

                        x: {

                            ticks: {
                                color: "#8195ad"
                            },

                            grid: {
                                color:
                                    "rgba(100,130,160,.08)"
                            }

                        },

                        y: {

                            beginAtZero: true,

                            ticks: {
                                color: "#8195ad"
                            },

                            grid: {
                                color:
                                    "rgba(100,130,160,.08)"
                            }

                        }

                    }

                }

            }
        );

}


/* ============================================================
   RESOURCE TYPE CHART
   ============================================================ */

function renderResourceChart(
    results
) {

    const counts = {};


    results.forEach(
        item => {

            const type =
                getValue(
                    item,
                    "resourceType",
                    "type"
                ) ||
                "Other";


            counts[type] =
                (
                    counts[type] ||
                    0
                ) + 1;

        }
    );


    const labels =
        Object.keys(
            counts
        );


    const values =
        Object.values(
            counts
        );


    if (resourceChart) {

        resourceChart.destroy();

    }


    resourceChart =
        new Chart(
            $("resourceChart"),
            {

                type: "doughnut",

                data: {

                    labels,

                    datasets: [

                        {

                            data:
                                values,

                            backgroundColor: [

                                "#1677ff",

                                "#31bd68",

                                "#ff9f1c",

                                "#a66cff",

                                "#22b8cf",

                                "#8091a7",

                                "#e05cff",

                                "#4e79a7"

                            ],

                            borderWidth: 0

                        }

                    ]

                },


                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    cutout: "68%",

                    plugins: {

                        legend: {
                            display: false
                        }

                    }

                }

            }
        );


    /*
     * Legend
     */

    const legend =
        $("resourceLegend");


    legend.innerHTML =
        labels
            .slice(
                0,
                7
            )
            .map(
                (
                    label,
                    index
                ) => `

                    <div>

                        <span
                            style="
                            display:inline-block;
                            width:8px;
                            height:8px;
                            border-radius:50%;
                            background:
                            ${
                                [
                                    "#1677ff",
                                    "#31bd68",
                                    "#ff9f1c",
                                    "#a66cff",
                                    "#22b8cf",
                                    "#8091a7",
                                    "#e05cff"
                                ][index]
                            };
                            margin-right:7px;
                            ">
                        </span>

                        ${escapeHtml(
                            label
                        )}

                        <span
                            style="
                            margin-left:8px;
                            color:#70869e;
                            ">

                            ${
                                counts[label]
                            }

                        </span>

                    </div>

                `
            )
            .join("");

}


/* ============================================================
   EXPORT CSV
   ============================================================ */

function exportCsv() {

    if (
        filteredResults.length ===
        0
    ) {

        showMessage(
            "There are no results to export.",
            "error"
        );

        return;

    }


    const headers = [

        "Resource Name",

        "Resource Type",

        "Resource Group",

        "Rule / Property",

        "Current Value",

        "Status",

        "Message",

        "Time"

    ];


    const rows =
        filteredResults.map(
            item => [

                getValue(
                    item,
                    "resourceName",
                    "name"
                ),

                getValue(
                    item,
                    "resourceType",
                    "type"
                ),

                getValue(
                    item,
                    "resourceGroup",
                    "resourceGroupName"
                ),

                getValue(
                    item,
                    "ruleName",
                    "ruleId",
                    "propertyName"
                ),

                getValue(
                    item,
                    "currentValue",
                    "value"
                ),

                getValue(
                    item,
                    "status",
                    "complianceStatus"
                ),

                getValue(
                    item,
                    "message",
                    "reason"
                ),

                getValue(
                    item,
                    "timestamp",
                    "time"
                )

            ]

        );


    const csv = [

        headers,

        ...rows

    ]

        .map(
            row =>
                row
                    .map(
                        cell =>
                            `"${String(cell)
                                .replaceAll(
                                    '"',
                                    '""'
                                )}"`
                    )
                    .join(",")
        )

        .join("\n");


    const blob =
        new Blob(
            [csv],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    link.href =
        url;


    link.download =
        "compliance-report.csv";


    link.click();


    URL.revokeObjectURL(
        url
    );

}


/* ============================================================
   RUN SCAN
   ============================================================ */

async function runScan() {

    const button =
        $("scanBtn");


    button.disabled =
        true;


    button.textContent =
        "⏳ Scanning...";


    try {

        const result =
            await callApi(
                API.scan,
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({})

                }
            );


        $("rawResponse")
            .textContent =
            JSON.stringify(
                result,
                null,
                2
            );


        showMessage(
            "Compliance scan completed successfully.",
            "success"
        );


        /*
         * Reload results
         */

        setTimeout(
            loadDashboard,
            1000
        );

    }

    catch (error) {

        console.error(
            error
        );


        showMessage(
            "Compliance scan failed: " +
            error.message,
            "error"
        );

    }

    finally {

        button.disabled =
            false;


        button.textContent =
            "▶ Run Scan";

    }

}


/* ============================================================
   UTILITY FUNCTIONS
   ============================================================ */

function formatValue(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "—";

    }


    if (
        typeof value ===
        "object"
    ) {

        return JSON.stringify(
            value
        );

    }


    return String(value);

}


function formatDate(
    value
) {

    try {

        return new Date(
            value
        ).toLocaleString();

    }

    catch {

        return String(
            value
        );

    }

}


function escapeHtml(
    value
) {

    return String(
        value
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


/* ============================================================
   EVENT HANDLERS
   ============================================================ */

$("refreshBtn")
    .addEventListener(
        "click",
        loadDashboard
    );


$("scanBtn")
    .addEventListener(
        "click",
        runScan
    );


$("exportBtn")
    .addEventListener(
        "click",
        exportCsv
    );


$("searchInput")
    .addEventListener(
        "input",
        filterResults
    );


$("typeFilter")
    .addEventListener(
        "change",
        filterResults
    );


$("statusFilter")
    .addEventListener(
        "change",
        filterResults
    );


$("prevPage")
    .addEventListener(
        "click",
        () => {

            if (
                currentPage >
                1
            ) {

                currentPage--;

                renderTable();

            }

        }
    );


$("nextPage")
    .addEventListener(
        "click",
        () => {

            const maxPage =
                Math.ceil(
                    filteredResults.length /
                    pageSize
                );


            if (
                currentPage <
                maxPage
            ) {

                currentPage++;

                renderTable();

            }

        }
    );


/* ============================================================
   START APPLICATION
   ============================================================ */

loadDashboard();