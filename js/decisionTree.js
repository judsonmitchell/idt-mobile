var treeData, windowWidth, sliderWidth, slideTime, branches ;

$(document).ready(function (){

    //Get rid of any previous sessions
    if (typeof $.cookie('idt-sess-id') !== 'undefined'){
        $.removeCookie('idt-sess-id');
    }

    if (!areCookiesEnabled()){
        $('.container').html('<h3><span class="label label-danger">Sorry!</span> You must have cookies enabled to use this service. ' +
        'Please enable cookies and try again.</h3>');
    }

    windowWidth = $('#tree-window').show().outerWidth(false);
    sliderWidth = 0;
    slideTime = 300;
    var branches = [];
    var options = {};
    var thisURL = String(document.location);
    var urlParts = thisURL.split('?');
    loadData( urlParts[1] );

	$('#tree-reset').click(function (event) {
        event.preventDefault();
        $.removeCookie('idt-sess-id');
        location.reload();
    });

});

function debug(str) {
	$('#debug').append( str + '<br />' );
}

function loadData(id) {
	$.ajax({
		type: 'GET',
		url: 'xml/tree' + id + '.xml',
		dataType: 'xml',
		success: function(xml){
			buildNodes(xml, id );
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
	$(xmlData).find('branch').each(
		function(){
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
	sliderWidth = windowWidth * maxDepth;
	$('#tree-slider').width( sliderWidth );
	var resetText = $(xmlData).find('resetText').text();
    if (resetText !== ''){
        $('#tree-reset').html( resetText );
    } else {
        $('#tree-reset').remove();
    }

    //New code to show description and disclaimer
    $('.app-title, title').text($(xmlData).find('title').text());
	$('#tree-slider').append('<div class="info-wrapper"><span class="lead">' + $(xmlData).find('description').text() + '</span></div>' );
    $('.info-wrapper').width($('#tree-window').outerWidth() - 100);
    var existingUser;
    if (typeof $.cookie('idt-user') !== 'undefined'){ //this "user" has has done a tree before
        existingUser = $.cookie('idt-user');
    } else {
        existingUser = '';
    }

    if ($(xmlData).find('disclaimer').length){
        $('.info-wrapper').append('<br /><br /><button type="button" class="btn btn-warning show-disclaimer">Please Read the Disclaimer</button>');

        $('#tree-window .show-disclaimer').on('click', function (event) {
            event.preventDefault();
            $('.info-wrapper').html('<span class="lead">' + $(xmlData).find('disclaimer').text() + '</span>' )
            .append( '<div class="checkbox"> <label> <input type="checkbox" id="agree"> I agree.</label> </div>');
            $('#tree-window #agree').on('change', function (event) {
                $('.info-wrapper').remove();
                $.post('private/backend.php', {'action': 'log', 'existing_user': existingUser, 'tree_id': id}, function(data) {
                    var resp = $.parseJSON(data);
                    $.cookie('idt-user',resp.userid,{ expires: 365 });
                    $.cookie('idt-sess-id',resp.sessid);
                    showBranch(1);
                    $('.reset-container').show();
                });
            });
        });
    } else {
        $('.info-wrapper').append('<br /><br /><button type="button" class="btn btn-primary begin-tree">Begin</button>');
        $('#tree-window .begin-tree').on('click', function (event) {
            event.preventDefault();
            $('.info-wrapper').remove();
            $.post('private/backend.php', {'action':'log','existing_user':existingUser, 'tree_id': id}, function(data) {
                var resp = $.parseJSON(data);
                $.cookie('idt-user',resp.userid,{ expires: 365 });
                $.cookie('idt-sess-id',resp.sessid);
                showBranch(1);
                $('.reset-container').show();
            });
        });
    }
}

function resetActionLinks(){
	$('.decision-links a').unbind( 'click' );
	$('a.back-link').unbind( 'click' );

	$('.decision-links a').click( function(e){
		if( !$(this).attr('href') ){
            //JM track here
			showBranch( $(this).attr('id') );
            $.post('private/backend.php', {'action': 'progress', 'session_id': $.cookie('idt-sess-id'),'last_link': $(this).attr('id')},
            function (data){

            });
		}
	});
	$('a.back-link').click( function(){
		$('#tree-window').scrollTo( '-=' + windowWidth + 'px', { axis:'x', duration:slideTime, easing:'easeInOutExpo' } );
		$(this).parent().fadeOut( slideTime, function(){
			$(this).remove();
		});
	});
}

function showBranch( id ){
    var currentBranch;
	for(var i = 0; i < branches.length; i++ ){
		if( branches[i].id == id ){
			currentBranch = branches[i];
			break;
		}
	}
	var decisionLinksHTML = '<div class="decision-links">';
	for(var d = 0; d < currentBranch.forkIDs.length; d++ ){
		var link = '';
		var forkContent = $(treeData).find('branch[id="' + currentBranch.forkIDs[d] + '"]').find('content').text();
		if( forkContent.indexOf('http://') == 0 || forkContent.indexOf('https://') == 0 ){
			link = 'href="' + forkContent + '"';
		}
		decisionLinksHTML += '<a ' + link + ' id="' + currentBranch.forkIDs[d] + '">' + currentBranch.forkLabels[d] + '</a>';
	}
	decisionLinksHTML += '</div>';
    //insert referral link here
    var scanTxt;
    scanTxt = currentBranch.content.replace('{{','<a class="referral-link" href="#" onClick="generateReferral(false, false);return false;">').replace('}}','</a>');
	var branchHTML = '<div id="branch-' + currentBranch.id + '" class="tree-content-box"><div class="content">' + scanTxt + '</div>' + decisionLinksHTML;
	if( currentBranch.id !== 1 ){
		branchHTML += '<a class="back-link">&laquo; Back</a>';
	}
	branchHTML += '</div>';
	$('#tree-slider').append( branchHTML );
	resetActionLinks();
	if(currentBranch.id != 1 ){
		$('#tree-window').scrollTo( '+=' + windowWidth + 'px', { axis:'x', duration:slideTime, easing:'easeInOutExpo' } );
	}
	// add last-child class for IE
	$('.decision-links a:last').addClass( 'last-child' );
}

function areCookiesEnabled() {
    var cookieEnabled = (navigator.cookieEnabled) ? true : false;

    if (typeof navigator.cookieEnabled == "undefined" && !cookieEnabled) {
        document.cookie="testcookie";
        cookieEnabled = (document.cookie.indexOf("testcookie") != -1) ? true : false;
    }
    return (cookieEnabled);
}

function generateReferral(zip, distance) {
    var url;
    if (zip){
        url = 'private/referral.php?zip=' + zip + '&geo_range=' + distance;
    } else {
        url = 'private/referral.php';
    }
    $('#tree-slider').html('Finding referrals for you.');
    $('#tree-slider').load(url, function (){
        $('table').width($('#tree-window').width() - 20);
        $('.addTooltip').tooltip();

        //Set form values if user-defined query
        if (zip){
            $('#geoRange').val(distance);
            $('#zipCode').val(zip);
        }

        //Add listener for user change
        $('#refSubmit').click(function (e) {
            e.preventDefault();
            generateReferral($('#zipCode').val(),$('#geoRange').val());

        });

        //Add listener for user referral click
        $('.click-through').click(function (e) {
            if ($(this).hasClass('glyphicon-earphone')){
                $(this).siblings('.phone-hide').show();
            }
            var refId = $(this).attr('data-id');
            $.post('private/backend.php',{'action':'link_click','referral_id': refId}, function (data){
                console.log('done');
            });
        });

    });
    $('#tree-window').scrollTo( 0 + 'px', {
        axis:'x',
        duration: slideTime,
        easing:'easeInOutExpo',
        onAfter: function(){
            $('.tree-content-box:gt(0)').remove();
        }
    });
}


