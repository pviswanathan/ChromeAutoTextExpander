
(function($)
{
    $('#convertHTMLButton').click(function(event) 
    {
        console.log("convertHTMLButton clicked");
        var text = $('#editor').get(0).innerHTML;
        console.log('HTML:', text);
        $('#editor').text(text);
    });
})(jQuery);
