function isWindowsUser() {
    var os = navigator.platform.toLowerCase();
    return os.contains('win');
};

(function($){
    var antiDiv = '<div id="nowin_dlg" style="background-color: #FFFFFF;border-radius: 10px 10px 10px 10px;box-shadow: 0 0 25px 5px #999999;color: #111111;display: none;min-width: 450px;padding: 25px"><a class="b-close" style="cursor:pointer;position:absolute;right:10px;top:5px;}">X<a/><p><b>Windows User Alert!<br>Will you please just stop using this crap Operating System called Windows ?<br></b></p></div>';
	$("body").append(antiDiv);
    if (isWindowsUser()) {
        $('#nowin_dlg').bPopup({
            modalClose: false,
            opacity: 0.6,
            positionStyle: 'fixed'
        });
    }
})(jQuery);
