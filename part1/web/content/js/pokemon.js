
$(document).ready(function(){
    $('#pokemon-id-input').keydown(function(event) {
        // enter has keyCode = 13
        if (event.keyCode == 13) {
          query();
          return false;
        }
    });
});

function query() {
    // #### APP API ENDPOINT ####
    let api_url = '/app/pokemon';
    // ##########################
    let query = $("#pokemon-id-input").val();
    $('#status').html('<i class="fa fa-spinner fa-spin"></i> Searching...');

    $.ajax({
        url: api_url + "?query=" + query,
        contentType: "application/json",
        dataType: 'json',
    })
    .done( function(data, textStatus, jqXHR){
        $('#status').html('<i class="fa fa-thumbs-up" style="color: green;"></i> Complete!');
        console.log(data);
        drawDataTable(data);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        $('#status').html('<i class="fa fa-exclamation-triangle" style="color: red;"></i> Error: ' + errorThrown);
    });
}

function drawDataTable(data) {
    $("#search-table").replaceWith(`
        <div id="search-table" class="table-responsive scrollbars">
            <table id="results" class="table table-hover">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>HP</th>
                        <th>Attack</th>
                        <th>Defence</th>
                        <th>Sp. Atk</th>
                        <th>Sp. Def</th>
                        <th>Speed</th>
                        <th>Total</th>
                        <th>Image</th>
                    </tr>
                </thead>
            </table>
        </div>
    `);

    let tbody = $("<tbody />");
    for (var i = 0; i < data.length; i++) {
        let row = drawRow(data[i]);
        tbody.append(row);
    }
    $("#results").append(tbody);
}

function drawRow(rowData) {
    let row = $("<tr />");
    if (rowData.evolution.name === "") {
        row.append($("<td>" + rowData.name + "</td>"));
    } else {
        row.append($("<td>" + rowData.evolution.name + "</td>"));
    }
    let pokeType = "";
    for (var i = 0; i < rowData.type.length; i++) {
        pokeType = rowData.type[i]+ "<br>" + pokeType;
    }
    row.append($("<td>" + pokeType + "</td>"));
    row.append($("<td>" + rowData.hp + "</td>"));
    row.append($("<td>" + rowData.attack + "</td>"));
    row.append($("<td>" + rowData.defense + "</td>"));
    row.append($("<td>" + rowData.sp_atk + "</td>"));
    row.append($("<td>" + rowData.sp_def + "</td>"));
    row.append($("<td>" + rowData.speed + "</td>"));
    row.append($("<td>" + rowData.total + "</td>"));
    // note we inline a small alternate image for those where there is a 404 for their sprites
    row.append($('<td><img src="' + rowData.sprites.animated + '" onerror="this.onerror=null;this.src=' + "'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='" + ';" /></td>'));
    return row;
}