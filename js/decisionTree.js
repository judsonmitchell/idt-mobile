// Modification of original decisionTree.js for mobile

var treeData,
    branches,
    backendUrl = 'http://loyolalawtech.org/idt/', //url for server to handle logging
    treeId = '1374682207'; //id of the tree, as generated by IDT.

document.addEventListener('deviceready', onDeviceReady, false);

function onDeviceReady(){
    var networkState = navigator.connection.type;
    var states = {};
    if (networkState === 'none'){
        $('.panel-body').html('<h3>You are offline</h3><p>Your device appears to be offline. ' +
        'You need to be connected to the internet to use this application');
        return;
    } else {
        //Get rid of any previous sessions 
        if (window.localStorage.getItem('idt-sess-id')){
            window.localStorage.removeItem('idt-sess-id');
        }
        var branches = [];
        var options = {};
        loadData();
    }
}

//For local testing
//$(document).ready(function () {
//    var branches = [];
//    var options = {};
//    loadData();
//});

function loadData() {
	$.ajax({
		type: 'GET',
		url: 'data/data.xml',
		dataType: 'xml',
		success: function(xml){
			buildNodes(xml, treeId );
		}
	});
}

function TreeBranch() {
	this.id = '';
	this.content = '';
	this.forkIDs = [];
	this.forkLabels = [];
}

function buildNodes(xmlData, id) {
	var maxDepth = 0;
    branches = [];
	treeData = xmlData;
	$(xmlData).find('branch').each(function(){
			var branch = new TreeBranch();
			branch.id = $(this).attr('id');
			branch.content = $(this).find('content').text();
			$(this).find('fork').each(
				function(){
					branch.forkIDs.push( $(this).attr('target') );
					branch.forkLabels.push( $(this).text() );
				}
			);
			branches.push( branch );
			var branchDepthParts = branch.id.split('.');
			if( branchDepthParts.length > maxDepth ){
				maxDepth = branchDepthParts.length;
			}
        });

	var resetText = $(xmlData).find('resetText').text();
    if (resetText !== ''){
        $('#tree-reset').html(resetText);
    } else {
        $('#tree-reset').remove();
    }

    //New code to show description and disclaimer
    $('.app-title, title ').text($(xmlData).find('title').text());
	$('.panel-body').html($(xmlData).find('description').text() );
    var existingUser = '';
    if (window.localStorage.getItem('idt-user')){ //this "user" has has done a tree before
        existingUser = window.localStorage.getItem('idt-user');
    } else {
        existingUser = '';
    }

    if ($(xmlData).find('disclaimer').length){
        $('.panel-footer').html('<button type="button" class="btn btn-info show-disclaimer">Please Read the Disclaimer</button>');

        $('#tree-window .show-disclaimer').on('click', function (event) {
            event.preventDefault();
            $('.panel-body').html($(xmlData).find('disclaimer').text());
            $('.panel-footer').html('<div class="checkbox"> <label class="lead"> <input type="checkbox" id="agree"> <strong>I agree.</strong></label> </div>');
            $('#agree').on('change', function (event) {
                $.post(backendUrl + 'private/backend.php', {'action': 'log', 'existing_user': existingUser, 'tree_id': treeId, 'mobile': '1'}, function(data) {
                    var resp = $.parseJSON(data);
                    window.localStorage.setItem('idt-user', resp.userid);
                    window.localStorage.setItem('idt-sess-id', resp.sessid);
                    showBranch(1);
                    $('.page-header').hide();
                    $('.navbar').removeClass('hidden');
                });
            });
        });
    } else {
        $('.panel-footer').html('<button type="button" class="btn btn-info begin-tree">Begin</button>');
        $('#tree-window .begin-tree').on('click', function (event) {
            event.preventDefault();
            $.post(backendUrl + 'private/backend.php', {'action':'log','existing_user':existingUser, 'tree_id': id}, function(data) {
                var resp = $.parseJSON(data);
                window.localStorage.setItem('idt-user', resp.userid);
                window.localStorage.setItem('idt-sess-id', resp.sessid);
                showBranch(1);
                $('.page-header').hide();
                $('.navbar').removeClass('hidden');
            });
        });
    }
}

function resetActionLinks(){
	$('.decision-links a').unbind('click');
	$('a.back-link').unbind('click');

	$('.decision-links .btn').click(function(e){
		if( !$(this).attr('href') ){
            //JM track here
			showBranch( $(this).attr('id') );
            $.post(backendUrl + 'private/backend.php', {'action': 'progress', 'session_id': window.localStorage.getItem('idt-sess-id'),'last_link': $(this).attr('id')});
		}
	});
	$('a.back-link').click(function(){
        //Go to previous item in xml tree
        var lastQ = $('.panel-body').attr('data-branch').slice(0,-2);
        showBranch(lastQ);
	});
}

function showBranch(id){
    var currentBranch;

	for(var i = 0; i < branches.length; i++ ){
		if( branches[i].id == id ){
			currentBranch = branches[i];
			break;
		}
	}

	var decisionLinksHTML = '<div class="decision-links row">';
	if(currentBranch.id !== '1'){
		decisionLinksHTML += '<div class="col-md-6"><h5><a class=" back-link">  <span class="glyphicon glyphicon-chevron-left"></span> Back</a></h5></div>';
    }
    else {
		decisionLinksHTML += '<div class="col-md-6"></div>';
    }

	for(var d = 0; d < currentBranch.forkIDs.length; d++ ){
		var link = '';
		var forkContent = $(treeData).find('branch[id="' + currentBranch.forkIDs[d] + '"]').find('content').text();
		if( forkContent.indexOf('http://') == 0 || forkContent.indexOf('https://') == 0 ){
			link = 'href="' + forkContent + '"';
		}
        if (d === 1){
            decisionLinksHTML += '<div class="col-md-3"><a class="btn btn-info btn-block"  ' + link + ' id="' + currentBranch.forkIDs[d] + '">' + currentBranch.forkLabels[d] + '</a></div>';
        } else {
            decisionLinksHTML += '<div class="col-md-3"><a class="btn btn-info btn-block"  ' + link + ' id="' + currentBranch.forkIDs[d] + '">' + currentBranch.forkLabels[d] + '</a></div>';
        }
	}

	decisionLinksHTML += '</div>';

    //insert referral link here
    var scanTxt = currentBranch.content.replace('{{','<a class="referral-link" href="#" onClick="generateReferralGeo();return false;">').replace('}}','</a>');
	var branchHTML = '<div id="branch-' + currentBranch.id + '" class="tree-content-box lead"><div class="content">' + scanTxt + '</div></div>';
	$('.panel-body').html(branchHTML).attr('data-branch',currentBranch.id);
    $('.panel-footer').html(decisionLinksHTML);

	resetActionLinks();
}

function addReferralListeners(){

    $('.panel-default').hide();

    $('.ref-toggle').click(function (e){
        $('.ref-chooser').removeClass('hidden');
    });

    //Add listener for user change
    $('#refSubmit').click(function (e) {
        e.preventDefault();
        generateReferralManual($('#zipCode').val(),$('#geoRange').val());

    });

    //Add listener for user referral click
    $('.click-through').click(function (e) {
        e.preventDefault();
        var url = $(this).attr('href');
        var refId = $(this).attr('data-id');
        var user = window.localStorage.getItem('idt-user');
        var sess = window.localStorage.getItem('idt-sess-id');
        var thisIsAPhone = false;
        if ($(this).hasClass('phone-link')){
            thisIsAPhone = true;
        }

        $.post(backendUrl + 'private/backend.php',{'action':'link_click_mobile','referral_id': refId, 'sess_id': sess, 'user_id':user}, function (data){

            if (thisIsAPhone){
                var strip = url.replace(/[^a-zA-Z\d:]/g, '');
                window.open(strip, '_system');
            } else {
                window.open(url, '_system', 'location=yes');
                //navigator.app.loadUrl(url, { openExternal:true });
            }
        });
    });

}

function generateReferralManual(zip, distance){

    var url = backendUrl + 'private/referral_mobile.php?zip=' + zip + '&geo_range=' + distance;
    $('#referral-results').load(url, function (){
        $('#zipCode').val(zip);
        $('#geoRange').val(distance);
        addReferralListeners();
    });
}

function generateReferralGeo() {
    var sessId = window.localStorage.getItem('idt-sess-id');

    $('.panel-body').html('Attempting to get your location.');
    navigator.geolocation.getCurrentPosition(function succcess(position){
        $.post(backendUrl + 'private/backend.php', {
            action: 'update_location',
            lat: position.coords.latitude,
            long: position.coords.longitude,
            user_id: window.localStorage.getItem('idt-user')
        },function (e){
            $('.panel-body').html('Finding referrals for you.');
        });
        $('#referral-results').load(backendUrl + 'private/referral_mobile.php?sess_id=' + sessId, function (){
            addReferralListeners();
            $('#zipCode').attr('placeholder', 'Please Provide Zip Code');
        });
    }, function fail(){
        var zipForm = '<h3>Geolocation is unavailable.</h3>' +
        '<form name="zip_only"><input type="number" name="zip" placeholder="Enter Your Zip Code"><button type="submit">Go</button></form>';
        $('.panel-body').html(zipForm);
        $('form[name="zip_only"]').submit(function (e) {
            e.preventDefault();
            var userZip = $(this).find('input').val();
            generateReferralManual(userZip,'105600');
        });
    },
    { maximumAge: 3000, timeout: 5000, enableHighAccuracy: true }
    );

}


$('.external-link').click(function (e){
    e.preventDefault();
    var url = $(this).attr('href');
    //navigator.app.loadUrl(url, { openExternal:true });
    window.open(url, '_system', 'location=yes');
});
