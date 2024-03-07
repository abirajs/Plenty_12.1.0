jQuery(document).ready(function() {
    // Load the Google Pay button
    try {
        // Load the payment instances
        var NovalnetPaymentInstance  = NovalnetPayment();
        var NovalnetWalletPaymentObj = NovalnetPaymentInstance.createPaymentObject();
        // Setup the payment intent
        var requestData = {
            clientKey: String(jQuery('#nn_client_key').val()),
            paymentIntent: {
                merchant: {
                    paymentDataPresent: false,
                    countryCode : String(jQuery('#nn_google_pay').attr('data-country')),
                    partnerId: jQuery('#nn_merchant_id').val(),
                },
                transaction: {
                    setPendingPayment: true,
                    amount: String(jQuery('#nn_google_pay').attr('data-total-amount')),
                    currency: String(jQuery('#nn_google_pay').attr('data-currency')),
                    enforce3d: Boolean(jQuery('#nn_enforce').val()),
                    paymentMethod: "GOOGLEPAY",
                    environment: jQuery('#nn_environment').val(),
                },
                custom: {
                    lang: String(jQuery('#nn_google_pay').attr('data-order-lang'))
                },
                order: {
                    paymentDataPresent: false,
                    merchantName: String(jQuery('#nn_business_name').val()),
                    billing: {
                    	requiredFields: ["postalAddress", "phone", "email"]
                    },
                    shipping: {
                    	requiredFields: ["postalAddress", "phone"],
                        methods: [
                          {
                            identifier: "freeshipping",
                            amount: 0,
                            detail: "Free shipping within Deutschland",				
                            label: "Free Shipping"
                          },
                          {
                            identifier: "dhlshipping",
                            amount: 500,
                            detail: "The product will be delivered depends on the executive",
                            label: "DHL Shipping"
                          }
                        ],
                        defaultIdentifier: "dhlshipping",	
                        methodsUpdatedLater: true
                     }
                },
                button: {
                    type: jQuery('#nn_button_type').val(),
                    locale: ( String(jQuery('#nn_google_pay').attr('data-order-lang')) == 'EN' ) ? "en-US" : "de-DE",
                    boxSizing: "fill",
                    dimensions: {
                        height: parseInt(jQuery('#nn_button_height').val())
                    }
                },
                callbacks: {
                    onProcessCompletion: function (response, processedStatus) {
                        processedStatus({status: "SUCCESS", statusText: ""});
                        // Only on success, we proceed further with the booking
                        if(response.result.status == "SUCCESS") {
                            console.log(response);
                            jQuery('#nn_google_pay_token').val(response.transaction.token);
                            jQuery('#nn_google_pay_do_redirect').val(response.transaction.doRedirect);                               
                            jQuery('#nn_google_pay_form').submit();
                            jQuery('#nn_google_pay').find('button').prop('disabled', true);
                        } else {
                            // Upon failure, displaying the error text
                            if(response.result.status_text) {
                                console.log(response);
                                alert(response.result.status_text);
                            }
                        }
                    },
                    onPaymentButtonClicked: function(clickResult) {
                           clickResult({status: "SUCCESS"});
                        // Example usage:
                        var newItemData = {
                            sku: 'ABC123', // Replace with the SKU of the item you want to add
                            quantity: 1,   // Replace with the quantity of the item
                            price: 10.99   // Replace with the price of the item
                        };

                        addBasketItem(newItemData);
                    },
                }
            }
        };
        NovalnetWalletPaymentObj.setPaymentIntent(requestData);
        // Checking for the Payment method availability
        NovalnetWalletPaymentObj.isPaymentMethodAvailable(function(displayGooglePayButton) {
            if(displayGooglePayButton) {
                // Display the Google Pay payment
                NovalnetWalletPaymentObj.addPaymentButton("#nn_google_pay");
            } else {
                // Hide the Google Pay payment if it is not possible
                console.log('button not displayed');
            }
            console.log('test4'); 
        });
    } catch (e) {
        // Handling the errors from the payment intent setup
        console.log(e.message);
    }

    // Example function to add a basket item
function addBasketItem(itemData) {
    // Define your API endpoint for adding basket items
    var apiUrl = 'https://example-plentymarket-api.com/api/basket/items';

    // Make a POST request to the API endpoint
    fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // Add any necessary authentication headers here
            // Authorization: 'Bearer YOUR_ACCESS_TOKEN'
        },
        body: JSON.stringify(itemData) // Convert item data to JSON format
    })
    .then(response => {
        // Check if the request was successful
        if (!response.ok) {
            throw new Error('Failed to add item to basket');
        }
        return response.json(); // Parse response JSON
    })
    .then(data => {
        // Handle successful response (if needed)
        console.log('Item added to basket:', data);
    })
    .catch(error => {
        // Handle errors
        console.error('Error adding item to basket:', error);
    });
}


    
});
console.log('test5'); 
