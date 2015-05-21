define(["jquery","foundation"],function($) {

	var socket;

	var myInfo = {};

	var sessionKeys = {};	
	var session,publisher;

	function init() {

		$(document).foundation();
		//Foundation.libs.reveal.settings.close_on_background_click = false;
		//Foundation.libs.reveal.settings.close_on_esc = false;
		socket = io("https://all-chats-simple.herokuapp.com");
		_bindEvents();

		if(isTouchDevice()) {

			var videoHistory = $("#video-history");
			videoHistory.removeAttr("style");
			videoHistory.attr("width",320);
			videoHistory.attr("height",240);
		}
	}

	function _bindEvents() {

		$("#enter-room").on("click",enterRoom);
		$(document).on("click",".make-video-call",openConnectingToVideoCall);
		$(document).on("click",".make-audio-call",openConnectingToAudioCall);
		$(document).on("click","#reject-call",rejectCall);
		$(document).on("click","#accept-call",acceptCall);
		$(document).on("click","#accept-text-chat",acceptTextChat);
		$(document).on("click","#end-call",endCall);
		$(document).on("click","#start-video-recording",startVideoRecording);
		$(document).on("click","#stop-video-recording",stopVideoRecording);
		$(document).on("click","#play-video",playRecording);
		$(document).on("click","#return-menu",returnToMainMenu);
		$(document).on("click",".make-text-chat",sendInvitationForTextChat);
		$(document).on("keypress","#post-chat-text",handlePostChatKeypress);
		$(document).on("keypress","#nick-name",handleNameKeypress);
		$(document).on("click","#post-chat-button",handlePostChatButtonClick);
		$(document).on("click","#end-chat",endChat);
		
		socket.on("new-member",displayNewMember);
		socket.on("archive-started",handleArchiveStart);
		socket.on("archive-stopped",handleArchiveStopped);
		socket.on("online-people",loginSuccess);
		socket.on("member-disconnected",handleDisconnect);
		socket.on("receive-video-call",confirmVideoCall);
		socket.on("receive-audio-call",confirmAudioCall);
		socket.on("accept-text-chat",confirmTextChat);
		socket.on("call-rejected",showCallRejection);
		socket.on("video-call-accepted",showVideoCallOnAccept);
		socket.on("audio-call-accepted",showAudioCallOnAccept);
		socket.on("text-chat-accepted",showTextChatOnAccept);
		socket.on("receive-chat",receiveChat);
		socket.on("busy",handleBusy);
		socket.on("text-chat-ended",handleTextChatEnded);
		socket.on("free",handleFree);
		socket.on("call-end-result",handleCallEnd);
	}

	function handlePostChatKeypress(e) {

		var keyCode = e.keyCode || e.which;

		if(keyCode === 13) {
			var val = $("#post-chat-text").val().trim();
			
			if(val !== "") {
				$("#post-chat-text").val("");
				postChat(val);	
			}
			
		}
	}

	function handleNameKeypress(e) {

		var keyCode = e.keyCode || e.which;

		if(keyCode === 13) {
			enterRoom();
		}
	}

	function enterRoom() {

		var nickName = $("#nick-name").val().trim(),
			error = "";

		if(nickName.length < 3) {
			error = "Username should have atleast three characters";
		}

		else if(nickName.indexOf(" ") > 0) {
			error = "Username cannot contain space";	
		}

		if(error) {
			$("#index").find(".error-text").html(error);
			return;
		}
		$("#loader").removeClass("hide");

		myInfo.nickName = nickName;

		$("#my-nick-name").html(nickName);
		$("#index").find(".error-text").html("");

		socket.emit("login",{name : nickName},loginError);
	}

	function loginError(err) {
		$("#loader").addClass("hide");
		$("#index").removeClass("hide");
		$("#members-wrap").addClass("hide");
		$("#index").find(".error-text").html(err);
	}

	function loginSuccess(data) {

		$("#loader").addClass("hide");
		$("#index").addClass("hide");
		$("#members-wrap").removeClass("hide");

		if(data.length) {
			$("#no-members").addClass("hide");	
		}

		data.forEach(function(person) {
			displayNewMember(person);
		});

	}
	function handlePostChatButtonClick() {

		var val = $("#post-chat-text").val().trim();
		
		if(val !== "") {
			$("#post-chat-text").val("");
			postChat(val);	
		}
	}

	function postChat(text) {

		var chatter = $("#text-wrap").data("chatter");
		var str = '<p> <b>Me</b>: '+ text+'</p>';
		$(".chats").append(str);

		socket.emit("post-chat",{ text:text, sender : myInfo.nickName,chatter : chatter });
	}

	function receiveChat(data) {
		var str = '<p> <b>' + data.sender +'</b>: '+ data.text+'</p>';
		$(".chats").append(str);
	}


	function sendInvitationForTextChat(e) {

		$("#confirm-modal").html("<p> Sending your invitation. Please Wait..</p>")
		$("#confirm-modal").foundation('reveal', 'open');


		var caller = myInfo.nickName,
			callee = $(e.target).closest(".member").attr("data-name");

		//openTextChatDialog(); //TODO : Remove function
		socket.emit("make-text-chat",{caller :caller,callee :callee});
	}

	function confirmTextChat(caller) {
		confirmCall(caller,"text chat","accept-text-chat");
	}

	

	function startVideoRecording() {

		$("#stop-video-recording").removeClass("hide");
		$("#start-video-recording").addClass("hide");
		$("#video-call-buttons").addClass("hide");
		$("#video-loading").removeClass("hide");
		socket.emit("start-recording",sessionKeys.sessionId);
	}

	function stopVideoRecording() {

		$("#stop-video-recording").addClass("hide");
		$("#start-video-recording").addClass("hide");

		$("#video-call-buttons").addClass("hide");
		$("#video-loading").removeClass("hide");

		socket.emit("stop-recording");
	}

	function handleArchiveStart() {
		setTimeout(showCallButtons,1500);
	}

	function handleArchiveStopped() {
		setTimeout(showCallButtons,1500);
	}

	function showCallButtons() {
		$("#video-call-buttons").removeClass("hide");
		$("#video-loading").addClass("hide");	
	}

	function playRecording() {
		$("#video-history")[0].play();
	}

	function endCall() {
		session.disconnect();		
		$("#loader").removeClass("hide");
	}

	function handleCallEnd(url) {

		$('<div id="my-video"></div>').appendTo("#my-video-wrap");
		$('<div id="their-video"></div>').appendTo("#their-video-wrap");

		if(url) {
			$("#video-call").addClass("hide");
			$("#video-history-wrap").removeClass("hide");
			$("#video-history").attr("src",url);
		}
		else {
			$("#video-div,#media").addClass("hide");
			$("#members-wrap").removeClass("hide");
		}
		$("#loader").addClass("hide");
	}

	function returnToMainMenu() {

		$("#video-div,#media").addClass("hide");
		$("#members-wrap").removeClass("hide");
		$("#video-history").removeAttr("src");
		$("#video-call").removeClass("hide");
		$("#video-history-wrap").addClass("hide");

		$("#their-name").html("");
		//$(".chatter-name").addClass("hide");
		$("#video-call-buttons").addClass("hide");

	}

	function acceptCall() {

		if(!($("#video-history-wrap").hasClass("hide"))) {
			returnToMainMenu();
		}

		var isVideo = $("#media-modal").data("isVideo");
		
		var accepter = myInfo.nickName,
			accepted = $("#media-modal").data("caller");

		if(isVideo) {
			socket.emit("video-call-accepted",{accepter : accepter,accepted :accepted});
		} else {
			socket.emit("audio-call-accepted",{accepter : accepter,accepted :accepted});
		}
	}

	function acceptTextChat() {

		if(!($("#video-history-wrap").hasClass("hide"))) {
			returnToMainMenu();
		}

		var accepter = myInfo.nickName,
			accepted = $("#media-modal").data("caller");

		$("#confirm-modal").foundation('reveal', 'close');
		$("#text-wrap").data("chatter",accepted);
		$("#text-wrap").removeClass("hide");
		$("#members-wrap").addClass("hide");

		socket.emit("text-chat-accepted",{accepter : accepter,accepted :accepted});	
	}

	function showVideoCallOnAccept(keys,isAudio) {

		storeKeys(keys);
		_bindSessionEvents("their-video");

		$("#media-modal").foundation('reveal', 'close');
		$("#confirm-modal").foundation('reveal', 'close');
		$("#members-wrap").addClass("hide");
		$("#media").removeClass("hide");
		$("#video-div").removeClass("hide");

		$("#their-name").html(myInfo.caller);

		if(isAudio) {
			session.connect(sessionKeys["token"], function(error) {

				if(isTouchDevice()) {
					publisher = OT.initPublisher('my-video',{publishAudio: true,publishVideo : false});
				}	
				else {
					publisher = OT.initPublisher('my-video',{videoSource: null,height:320,width:550});
				}
				   
				session.publish(publisher);
			});
		}
		else {
			session.connect(sessionKeys["token"], function(error) {
				if(isTouchDevice()) {
					publisher = OT.initPublisher('my-video');
				}	
				else {
					publisher = OT.initPublisher('my-video',{height:320,width:550});
				}
			   	session.publish(publisher);
			});	
		}
	}

	function endChat() {
		var chatter = $("#text-wrap").data("chatter");
		clearChat();
		socket.emit("text-chat-end",{endedBy : myInfo.nickName,enderFor : chatter });
	}

	function clearChat() {
		$("#post-chat-text").val("");
		$(".chats").empty();
		$("#members-wrap").removeClass("hide");
		$("#text-wrap").addClass("hide");
	}

	function storeKeys(keys) {
		sessionKeys["sessionId"] = keys.sessionId;
		sessionKeys["token"] = keys.token;
		sessionKeys["apiKey"] = keys.apiKey;
	}

	function _bindSessionEvents(theirId) {

		session = OT.initSession(sessionKeys.apiKey,sessionKeys.sessionId);

		session.on('streamCreated', function(event) {

			if(isTouchDevice()) {
				subscriber = session.subscribe(event.stream,theirId);
			}
			else {
				subscriber = session.subscribe(event.stream,theirId,{height : 320,width : 550});
			}	
			subscriber.on("videoDisableWarning",function() {
				alert("The subscriber video may get disabled because either your or subscribers connectivity is slow");
			});

			subscriber.on("videoDisabled",function() {
				alert("The subscriber video is disabled because either your or subscribers connectivity is slow");
			});

			//subscriber.on("videoDisableWarningLifted",function() {
			//	alert("videoDisableWarningLifted");
			//});

			subscriber.on("videoEnabled",function() {
				alert("The subscriber video is enabled");
			});

			var movingAvg = null;

			//subscriber.on('audioLevelUpdated', function(event) {
			//	if (movingAvg === null || movingAvg <= event.audioLevel) {
			//		movingAvg = event.audioLevel;
			//	} else {
			//		movingAvg = 0.7 * movingAvg + 0.3 * event.audioLevel;
			//	}
            //
			//	// 1.5 scaling to map the -30 - 0 dBm range to [0,1]
			//	var logLevel = (Math.log(movingAvg) / Math.LN10) / 1.5 + 1;
			//	logLevel = Math.min(Math.max(logLevel, 0), 1);
			//	document.getElementById('subscriberMeter').innerHTML = logLevel;
			//});
		  
			$(".chatter-name").removeClass("hide");
			$("#video-call-buttons").removeClass("hide");
		});

		session.on('connectionDestroyed', function(event) {
			$("#loader").removeClass("hide");
		      session.disconnect();
		      socket.emit("call-ended");
		});
	}

	function showAudioCallOnAccept(keys) {

		showVideoCallOnAccept(keys,true);
	}

	function showTextChatOnAccept(chatter) {
		$("#members-wrap").addClass("hide");
		$("#text-wrap").data("chatter",chatter);
		$("#text-wrap").removeClass("hide");
		$("#confirm-modal").foundation('reveal', 'close');
		$("#media-modal").foundation('reveal', 'close');
	}

	function showCallRejection(rejecter) {
		$("#media-modal").foundation('reveal', 'close');
		$("#confirm-modal").foundation('reveal', 'close');
		$("#media-modal").html('<p>' + rejecter + ' has rejected your invitation </p>');

		$(document).on('closed.fndtn.reveal', '[data-reveal]', function () {
			$(document).off('closed.fndtn.reveal');
		  	$("#media-modal").foundation('reveal', 'open');
		});
	}

	function confirmVideoCall(caller) {
		$("#media-modal").data("isVideo",true);
		$("#start-video-recording").addClass("hide");
		confirmCall(caller,"video call","accept-call");
	}

	function confirmAudioCall(caller) {
		$("#media-modal").data("isVideo",false);
		$("#start-video-recording").addClass("hide");
		confirmCall(caller,"audio call","accept-call");	
	}

	function confirmCall(caller,str,acceptId) {

		$("#media-modal").data("caller",caller);
		myInfo.caller = caller;
		var str = '<p>'+ caller +' is inviting you for a '+ str +'</p><br>';
		str += '<a href="#" id="'+acceptId+'" class="button tiny"> Accept </a>';
		str += '<a href="#" id="reject-call" class="button tiny"> Reject </a>';
	
		$("#confirm-modal").html(str);
		$("#confirm-modal").foundation('reveal', 'open');
	}

	function rejectCall() {

		var rejecter = myInfo.nickName,
			rejected = $("#media-modal").data("caller");

		$("#confirm-modal").foundation('reveal', 'close');

		socket.emit("call-rejected",{rejecter : rejecter,rejected :rejected});	
	}

	

	function handleDisconnect(nickName) {
		$("[data-name='"+nickName+"']").remove();
	}

	function handleBusy(people) {

		people.forEach(function(element) {
			$("[data-name='"+element+"']").remove();
		});
	}

	function handleFree(people) {

		people.forEach(function(element) {
			displayNewMember(element);
		});
	}

	function handleTextChatEnded() {
		clearChat();		
	}

	function displayNewMember(nickName) {
		
		$("#no-members").addClass("hide");	

		var str = "<li class='member' data-name="+ nickName +"><span class='nick-name'>"+ nickName +"</span>";
		str += '<span class="call-type-container"><span class="first-type call-type make-video-call">video call</span> |' + '<span class="call-type make-audio-call">audio call</span>';
		str += ' | <span class="call-type make-text-chat">text chat</span></span></li>';
		$("#member-list").append(str)
	}

	function openConnectingToVideoCall(e) {
		$("#start-video-recording").removeClass("hide");
		openConnectingToCall(e,true);
	}

	function openConnectingToAudioCall(e) {
		$("#start-video-recording").removeClass("hide");
		openConnectingToCall(e,false);
	}

	function openConnectingToCall(e,isVideoCall) {

		$("#confirm-modal").html("<p> Connecting your call. Please Wait..</p>")
		$("#confirm-modal").foundation('reveal', 'open');

		var caller = myInfo.nickName,
			callee = $(e.target).closest(".member").attr("data-name"),
			roomName = myInfo.roomName;

		myInfo.caller = callee;	

		if(isVideoCall) {
			socket.emit("make-video-call",{roomName : roomName,caller :caller,callee :callee});
		}	
		else {
			socket.emit("make-audio-call",{roomName : roomName,caller :caller,callee :callee});
		}
	}

	function isTouchDevice() {
	    //return true;
	    return true == ("ontouchstart" in window || window.DocumentTouch && document instanceof DocumentTouch);
	};

	return {
		init : init
	}

});