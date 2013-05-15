function isWindowsUser() {
    var os = navigator.platform.toLowerCase();
    return /.*win.*/.test(os);
};

(function($){
    var antiDiv = '<div id="nowin_dlg" style="background-color: #FFFFFF;border-radius: 10px 10px 10px 10px;box-shadow: 0 0 25px 5px #999999;color: #111111;display: none;min-width: 450px;padding: 25px"><a class="b-close" style="cursor:pointer;position:absolute;right:10px;top:5px;}">X<a/><p><b>Windows User Spotted!<br>Will you please just stop using Windows and give Linux/Unix/Mac OS X a try? i think they are way more awesome than windows!<br></b></p><br><br><div style="padding-top=20px;font-size=10px;text-align:right">tell me if i am wrong and you are not using Windows, sorry about that:<</div></div>';
	$("body").append(antiDiv);
    if (isWindowsUser()) {
        $('#nowin_dlg').bPopup({
            modalClose: true,
            opacity: 0.6,
            positionStyle: 'fixed'
        });
    }
})(jQuery);
