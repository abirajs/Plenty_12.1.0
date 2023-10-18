jQuery('#nn_instalment_cycle').on('change',function() {
var selectedOption = this.options[this.selectedIndex];
var selectedValue = selectedOption.value;
var parts = selectedValue.split("-"); // Split the value into key and value

var key = parts[0];
var value = parts[1];

var cycleInformation = '';
for (instalmentCycle = 1; instalmentCycle <= key; instalmentCycle++) {
	if(instalmentCycle != key)
	{
		cycleInformation += '<tr><td>' + instalmentCycle + '</td><td>'+jQuery(this).find(':selected').attr('data-amount') +'</td></tr>';
	} else {
		var lastCycleAmount = (jQuery('#nn_net_amount').val() - (jQuery(this).find(':selected').attr('data-cycle-amount') * (key - 1)));
	var roundedValue = lastCycleAmount;
	var formatLastCycleAmount = roundedValue.toFixed(2);
		cycleInformation += '<tr><td>' + instalmentCycle + '</td><td>'+ formatLastCycleAmount + ' '+ jQuery('#nn_order_currency').val()+'</td></tr>';
	}
}
jQuery('#nn_instalment_cycle_information').html(cycleInformation);
}).change();


    // Restrict the special characters in the IBAN field
    jQuery('#nn_sepa_iban').on('input',function ( event ) {
        let iban = jQuery(this).val().replace( /[^a-zA-Z0-9]+/g, "" ).replace( /\s+/g, "" );
        jQuery(this).val(iban);
    });
    // After the form submission disable the action
    jQuery('#novalnet_form').on('submit',function() {
        jQuery('#novalnet_form_btn').prop('disabled', true);
        if(jQuery('#nn_show_birthday').val() == true && (jQuery("#nn_instalment_year").val() == '' || jQuery("#nn_instalment_date").val() == '' || jQuery("#nn_instalment_month").val() == '0')) {
           jQuery('#novalnet_form_btn').prop('disabled', false);
        }
        // Validate the BIC when if it is mandatory
        var ibanCountry = jQuery('#nn_sepa_iban').val().substring(0,2);
        if (ibanCountry.match(/(?:CH|MC|SM|GB)$/) && jQuery('#nn_sepa_bic').val() == '') {
            alert(jQuery('#nn_account_data_invalid').val());
            jQuery('#novalnet_form_btn').prop('disabled', false);
            return false;
        }
    });
    
      

