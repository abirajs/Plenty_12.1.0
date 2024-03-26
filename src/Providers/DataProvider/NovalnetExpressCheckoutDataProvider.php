<?php
/**
 * This file is used for displaying the Google Pay button
 *
 * @author       Novalnet AG
 * @copyright(C) Novalnet
 * @license      https://www.novalnet.de/payment-plugins/kostenlos/lizenz
 */
namespace Novalnet\Providers\DataProvider;

use Novalnet\Helper\PaymentHelper;
use Novalnet\Services\PaymentService;
use Novalnet\Services\SettingsService;
use Plenty\Plugin\Templates\Twig;
use Plenty\Modules\Basket\Models\Basket;
use Plenty\Modules\Basket\Contracts\BasketRepositoryContract;
use Plenty\Modules\Frontend\Session\Storage\Contracts\FrontendSessionStorageFactoryContract;
use Plenty\Modules\Order\Shipping\Countries\Contracts\CountryRepositoryContract;
use Plenty\Modules\Helper\Services\WebstoreHelper;
use Plenty\Plugin\Log\Loggable;
use Illuminate\Support\Collection;
/**
 * Class NovalnetExpressCheckoutDataProvider
 *
 * @package Novalnet\Providers\DataProvider
 */
class NovalnetExpressCheckoutDataProvider
{
    use Loggable;
    /**
     * Display the Google Pay button
     *
     * @param Twig $twig
     * @param BasketRepositoryContract $basketRepository
     * @param CountryRepositoryContract $countryRepository
     * @param WebstoreHelper $webstoreHelper
     * @param Arguments $arg
     *
     * @return string
     */
    public function call(Twig $twig,
                         BasketRepositoryContract $basketRepository,
                         CountryRepositoryContract $countryRepository,
                         WebstoreHelper $webstoreHelper,
                         $arg)
    {
        $basket             = $basketRepository->load();
        $paymentHelper      = pluginApp(PaymentHelper::class);
        $sessionStorage     = pluginApp(FrontendSessionStorageFactoryContract::class);
        $paymentService     = pluginApp(PaymentService::class);
        $settingsService    = pluginApp(SettingsService::class);    
        $this->getLogger(__METHOD__)->error('Novalnet::ExpressBasket failed', $basket);
        if($settingsService->getPaymentSettingsValue('payment_active', 'novalnet_googlepay') == true || $settingsService->getPaymentSettingsValue('payment_active', 'novalnet_applepay') == true) {
            if(!empty($basket->basketAmount)) {
                // Get the order total basket amount
                $orderAmount = $paymentHelper->convertAmountToSmallerUnit($basket->itemSumNet);
            }
            // Get the Payment MOP Id
            $paymentMethodDetails = $paymentHelper->getPaymentMethodByKey('NOVALNET_GOOGLEPAY');
            // Get the order language
            $orderLang = strtoupper($sessionStorage->getLocaleSettings()->language);
            // Get the countryCode
            $billingAddress = $paymentHelper->getCustomerAddress((int) $basket->customerInvoiceAddressId);
            // Get the seller name from the shop configuaration
            $sellerName = $settingsService->getPaymentSettingsValue('business_name', 'novalnet_googlepay');
            // Set the Wallet payments
            $applePay = $googlePay = [];
	    if($settingsService->getPaymentSettingsValue('payment_active', 'novalnet_googlepay') == true) {
		$googlePay = ['novalnet_googlepay'];
	   }
	   if($settingsService->getPaymentSettingsValue('payment_active', 'novalnet_applepay') == true) {
		$applePay = ['novalnet_applepay'];
	   }
	    $walletPayments = array_merge($googlePay, $applePay);
	    $enabledWalletPayment = json_encode($walletPayments);
	    $this->getLogger(__METHOD__)->error('Novalnet::$enabledWalletPayment', $enabledWalletPayment);
            // Required details for the Google Pay button
            $paymentTypes = ['novalnet_applepay' => 'APPLEPAY', 'novalnet_googlepay' => 'GOOGLEPAY'];
	    $configurationArr = [];
	    foreach($paymentTypes as $paymentTypeKey => $paymentTypeValue) {
		if($settingsService->getPaymentSettingsValue('payment_active', $paymentTypeKey) == true) {
			$configurationArr[$paymentTypeValue]['client_key'] =  trim($settingsService->getPaymentSettingsValue('novalnet_client_key'));
			$configurationArr[$paymentTypeValue]['seller_name'] =  !empty($sellerName) ? $sellerName : $webstoreHelper->getCurrentWebstoreConfiguration()->name;
			$configurationArr[$paymentTypeValue]['button_type'] =  $settingsService->getPaymentSettingsValue('button_type', $paymentTypeKey);
			$configurationArr[$paymentTypeValue]['button_height'] =  $settingsService->getPaymentSettingsValue('button_height', $paymentTypeKey);
			$configurationArr[$paymentTypeValue]['testmode'] =  ($settingsService->getPaymentSettingsValue('test_mode', $paymentTypeKey) == true) ? 'SANDBOX' : 'PRODUCTION';
		}
	     }
	     $configurationData = json_encode($configurationArr);
	     $merchantId = $settingsService->getPaymentSettingsValue('payment_active', 'novalnet_googlepay');
	     $isEnforceEnabled = $settingsService->getPaymentSettingsValue('enforce', 'novalnet_googlepay');
	     $sessionStorage->getPlugin()->setValue('paymentHide',null);
             $shippingMethod = $paymentHelper->getCheckout();
		
            foreach($shippingMethod['shippingProfileList'] as $shippingMethodDetails) {
			$shippingMethodAmount = $shippingMethodDetails['shippingAmount'];
			$convertedShippingAmount = $paymentHelper->convertAmountToSmallerUnit($shippingMethodAmount);
			$shippingDetails[] = array (
                        'identifier' => (string) $shippingMethodDetails['parcelServicePresetId'],
                        'label'      => $shippingMethodDetails['parcelServiceName'] . ' - ' . $shippingMethodDetails['parcelServicePresetName'], 
                        'amount'     => (int) ($convertedShippingAmount),
                        'id'         => (string) $shippingMethodDetails['parcelServicePresetId'],
                    );   
		    	// $shippingProfileId = (string) $shippingMethodDetails['parcelServicePresetId'];
            }
		
         $shippingDetails   = json_encode($shippingDetails);
	 $shippingProfileId = json_encode($shippingProfileId);

	 $availableShippingCountry = $countryRepository->getActiveCountriesList();
	 $availableShippingCountry = json_decode(json_encode($availableShippingCountry));
	 // $availableShippingCountry = json_decode($availableShippingCountry, true);

	 $availableShippingCountry = (array) $availableShippingCountry;
		
	 $availableShippingCountry = stripslashes($availableShippingCountry);
	 $availableShippingCountry = json_decode($availableShippingCountry, true);
		
	 $this->getLogger(__METHOD__)->error('Novalnet::$countryRepository', $availableShippingCountry);
         $this->getLogger(__METHOD__)->error('Novalnet::$shippingDetails', $shippingDetails);
	 $this->getLogger(__METHOD__)->error('Novalnet::$shippingMethod', $shippingMethod);
         $this->getLogger(__METHOD__)->error('Novalnet::$configurationData', $configurationArr);
         $this->getLogger(__METHOD__)->error('Novalnet::$paymentMethodDetails[0]', $paymentMethodDetails[0]);
         $this->getLogger(__METHOD__)->error('Novalnet::$paymentService->getProcessPaymentUrl()', $paymentService->getExpressPaymentUrl());
         // Render the Google Pay button
        return $twig->render('Novalnet::PaymentForm.NovalnetExpressCheckoutButton',
                                        [
                                            'paymentMethodId'       => $paymentMethodDetails[0],
                                            'countryCode'           => !empty($countryRepository->findIsoCode($billingAddress->countryId, 'iso_code_2')) ? $countryRepository->findIsoCode($billingAddress->countryId, 'iso_code_2') : 'DE',
                                            'orderAmount'           => $orderAmount,
                                            'orderLang'             => $orderLang,
                                            'orderCurrency'         => $basket->currency,
                                            'nnPaymentProcessUrl'   => $paymentService->getExpressPaymentUrl(),
					    'nnApplePayProcessUrl'  => $paymentService->getApplePaymentUrl(),
                                            'enabledWalletPayment'  => $enabledWalletPayment,
                                            'configurationData'     => $configurationData,
                                            'isEnforceEnabled'      => $isEnforceEnabled,
                                            'merchantId'   	    => $merchantId,
			     		    'shippingDetails'       => $shippingDetails,
			     		    'shippingProfileId'     => $shippingProfileId
                                        ]);
        } else {
            return '';
        }
    }
}
