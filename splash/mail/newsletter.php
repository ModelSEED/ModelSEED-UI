<?php
$recipient = "nconrad@anl.gov";
$subject = "Subscription to coremodels.mcs.anl.gov";

#$location = "URL";
$sender = $recipient;
$body = "This is an a newsletter subscription for coremodels.mcs.anl.gov\n\n";
$body .= "Email: ".$_REQUEST['email']." \n";

#echo "$body";
echo "<br>Thanks for subscribing!  <a href='/'>Go back</a>";

mail( $recipient, $subject, $body, "From: $sender" ) or die ("<br><br>Mail could not be sent.");



#header( "Location: $location" );
?>
