<?php
/**
 * This file is used for handling the payment cancel event procedure
 *
 * @author       Novalnet AG
 * @copyright(C) Novalnet
 * @license      https://www.novalnet.de/payment-plugins/kostenlos/lizenz
 */
namespace Novalnet\Procedures;

use Plenty\Modules\EventProcedures\Events\EventProceduresTriggered;
use Plenty\Modules\Order\Models\Order;
use Novalnet\Services\PaymentService;
use Novalnet\Constants\NovalnetConstants;
use Plenty\Plugin\Log\Loggable;
use Plenty\Modules\Plugin\DataBase\Contracts\DataBase;
use Plenty\Modules\Plugin\DataBase\Contracts\Query;
use Novalnet\Models\TransactionLog;

/**
 * Class VoidEventProcedure
 *
 * @package Novalnet\Procedures
 */
class InstalmentAllCycleEventProcedure
{
    use Loggable;
     /**
     *
     * @var PaymentService
     */
    private $paymentService;

    /**
     * Constructor.
     *
     * @param PaymentService $paymentService
     */

    public function __construct(PaymentService $paymentService)
    {
        $this->paymentService = $paymentService;
    }

    /**
     * @param EventProceduresTriggered $eventTriggered
     *
     */
    public function run(EventProceduresTriggered $eventTriggered)
    {
        /* @var $order Order */
        $order = $eventTriggered->getOrder();
        // Load the order language
        foreach($order->properties as $orderProperty) {
            if($orderProperty->typeId == '6' ) {
                $orderLanguage = $orderProperty->value;
            }
        }
        $this->getLogger(__METHOD__)->alert('Novalnet::instalment-order', $order);
        // Get necessary information for the capture process
       // $transactionDetails = $this->paymentService->getDetailsFromPaymentProperty($order->id);
       // $transactionDetails = $this->paymentService->getDatabaseValues($order->id);
        $database = pluginApp(DataBase::class);
        $transactionDetails = $database->query(TransactionLog::class)->where('orderNo', '=', $order->id)->limit(1)->get();
        $transactionDetails = $transactionDetails[0];
        $transactionDetails['lang'] = $orderLanguage;
        $transactionDetails['cancel_type'] = 'CANCEL_ALL_CYCLES';
        $this->getLogger(__METHOD__)->alert('Novalnet::instalment-tran-details', $transactionDetails);
        // Call the Recurring details process for the Instalment payments
        $this->paymentService->doInstalmentVoid($transactionDetails, NovalnetConstants::INSTALMENT_VOID_URL);
    }
}
