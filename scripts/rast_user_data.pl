#!/usr/bin/env perl

use Data::Dumper;
use WebApplication;
use strict;
use FIG_Config;
use lib './common/lib/RAST';


my $dbmaster = DBMaster->new(-database => $FIG_Config::webapplication_db   || "WebAppBackend",
			          -host     => $FIG_Config::webapplication_host || "bio-app-authdb",
			          -user     => $FIG_Config::webapplication_user || "rast",
			     -password => $FIG_Config::webapplication_password || "");

#...I'm sure there must be a cleaner way to do this... :-(
my @users;
if (@ARGV) {
    @users = @ARGV;
} else {
    @users = map { /(\S.*\S)/ ? $1 : () } <STDIN>;
    chomp @users;
}

my ($username, $userObj, $email, $firstname, $lastname);
foreach my $username (@users) {
    if (defined($userObj = $dbmaster->User->init({login => "$username"}))) {
	$email     = $userObj->email || q();
	$firstname = $userObj->firstname || q();
	$lastname  = $userObj->lastname  || q();
	
	if ($username && $email && $firstname && $lastname) {
	    print join("\t", $username, $email, $firstname, $lastname), "\n";
	}
	else {
	    print STDERR "FAILED: username=$username, email=$email, firstname=$firstname, lastname=$lastname\n";
	}
    }
    else {
	print STDERR "Could not fetch user object for username = \'$username\'\n";
    }
}
