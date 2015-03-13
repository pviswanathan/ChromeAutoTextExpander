
(function($)
{
    ///////////////////
    // Functions
   
    // Take selection and wrap in tags
    function wrapSelectionInTag(tag, selection)
    {
    }

    ////////////////////////
    // Setup editor buttons
    
    $('#boldButton').click(function(event) 
    {
        console.log("boldButton clicked");
    });

    $('#italicizeButton').click(function(event) 
    {
        console.log("italicizeButton clicked");
    });

    $('#underlineButton').click(function(event) 
    {
        console.log("underlineButton clicked");
    });

    $('#linkButton').click(function(event) 
    {
        console.log("linkButton clicked");
    });

    $('#convertHTMLButton').click(function(event) 
    {
        console.log("convertHTMLButton clicked");
        var text = $('#editor').get(0).innerHTML;
        console.log('HTML:', text);
        $('#editor').text(text);
    });

})(jQuery);
