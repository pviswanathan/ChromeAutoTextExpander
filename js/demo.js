
$(function()
{
    $('#convertHTMLButton').click(function(event) 
    {
        console.log("convertHTMLButton clicked");
        var text = $('#editor').innerHTML;
        console.log('HTML:', text);
        $('#editor').text(text);
    });
});
