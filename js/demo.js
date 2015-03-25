
(function($)
{
    ////////////////////////
    // Setup editor buttons
    $('#convertHTMLButton').click(function(event) 
    {
        console.log("convertHTMLButton clicked");
        var text = $('#demoDiv').get(0).innerHTML;
        console.log('HTML:', text);
        $('#demoDiv').text(text);
    });

    $('#demoDivButton').click(function(event)
    {
        $('#convertHTMLButton').addClass('active');
        $('#demoDiv').addClass('active');
        $('#demoTextArea').removeClass('active');
    });

    $('#demoTextareaButton').click(function(event)
    {
        $('#convertHTMLButton').removeClass('active');
        $('#demoTextArea').addClass('active');
        $('#demoDiv').removeClass('active');
    });

})(jQuery);
