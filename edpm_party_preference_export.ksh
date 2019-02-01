#!/bin/ksh
##############################################################################################################
##  Note: This job will EXPORT data from edpm tables.It does the following:
##        1. Export Party and Preference information from edpm tables.
##        2. Create the delta files for ADDITIONs and DELETEs between this exported file &
##           the last processed day's export file.
##       
##
##############################################################################################################
##
#
#. /home/ai816701/.profile
#------------------------------------------------------------------------------

echo Processing edpm_party_preference_export.ksh

. /home/udbcli01/sqllib/db2profile

loadtype=Delta
region=Prod

if [ $# -eq 0 ]
then
	echo $loadtype $region
elif [ $# -eq 1 ]
then 
	if  [ $1 = test ]
	then 
		region=Test
		echo $loadtype $region
	fi
	if  [ $1 = full ]
	then 
		loadtype=Full
		echo $loadtype $region
	fi

elif [ $# -eq 2 ]
then 
	if [ $1 = full ] 
	then 
		loadtype=Full
	fi
	if [ $2 = test ]
	then
		region=Test
	fi
	
fi
echo load type is : $loadtype 
echo region is : $region 


if  [ $region = Prod ]
then  
	rundir=/metlife/runtime/content/eDPMBatch/dump_data/ADedpm

else
	rundir=/metlife/runtime/content/eDPMBatch/dump_data/ADedpm
fi

echo Run directory is $rundir

cd $rundir



if [ $region = Prod ] 
then
	FTP_SERVER=$(cat $rundir/DIM.ini | grep 'customer.prod.servername' | cut -f2 -d =)
	FTP_UserId=$(cat $rundir/DIM.ini | grep 'customer.prod.userId' | cut -f2 -d =)
	FTP_Passwd=$(cat $rundir/DIM.ini | grep 'customer.prod.password' | cut -f2 -d =)
	FTP_PATH=$(cat $rundir/DIM.ini | grep 'customer.prod.ftpPath' | cut -f2 -d =)
	FTP_PATH_TRIGGER=$(cat $rundir/DIM.ini | grep 'customer.prod.ftpPath.trigger' | cut -f2 -d =)
	edpm_DBName=$(cat $rundir/DIM.ini | grep 'edpm_prod_Database_Name' | cut -f2 -d =)
	edpm_UserId=$(cat $rundir/DIM.ini | grep 'edpm_prod_Database_UserID' | cut -f2 -d =)
	edpm_Passwd=$(cat $rundir/DIM.ini | grep 'edpm_prod_Database_Password' | cut -f2 -d =|awk '{print $1}')
	schema=$(cat $rundir/DIM.ini | grep 'edpm_prod_Database_Schema_Name' | cut -f2 -d =)
	datadir=$(cat $rundir/DIM.ini | grep 'edpm_prod_outbound_data_dir' | cut -f2 -d =)
else 
	FTP_SERVER=$(cat $rundir/DIM.ini | grep 'customer.servername' | cut -f2 -d =)
	FTP_UserId=$(cat $rundir/DIM.ini | grep 'customer.userId' | cut -f2 -d =)
	FTP_Passwd=$(cat $rundir/DIM.ini | grep 'customer.password' | cut -f2 -d =)
	FTP_PATH=$(cat $rundir/DIM.ini | grep 'customer.ftpPath' | cut -f2 -d =)
	FTP_PATH_TRIGGER=$(cat $rundir/DIM.ini | grep 'customer.ftpPath.trigger' | cut -f2 -d =)
	edpm_DBName=$(cat $rundir/DIM.ini | grep 'edpm_Database_Name' | cut -f2 -d =)
	edpm_UserId=$(cat $rundir/DIM.ini | grep 'edpm_Database_UserID' | cut -f2 -d =)
	edpm_Passwd=$(cat $rundir/DIM.ini | grep 'edpm_Database_Password' | cut -f2 -d =|awk '{print $1}')
	schema=$(cat $rundir/DIM.ini | grep 'edpm_Database_Schema_Name' | cut -f2 -d =)
	datadir=$(cat $rundir/DIM.ini | grep 'edpm_outbound_data_dir' | cut -f2 -d =)
fi





classdir=$rundir/class


LOGFILE=$datadir/edpm_party_preference_export_`date +%Y_%m_%d_%H%M`.log

echo Logfile - $LOGFILE

inDate=`date +%Y%m%d`

outdata=$datadir/edpmPartyPreference_$inDate.dat


##
##  1. To export data from the edpm tables in the reqisite format.
##



db2 "connect to $edpm_DBName user $edpm_UserId using '$edpm_Passwd'";
rc_edpm_Connect=$?

if [ $rc_edpm_Connect -ne 0 ]
then
     echo Error connecting to edpm database. Ret Code - $rc_edpm_Connect | tee -a $LOGFILE
     echo edpm DBName : $edpm_DBName
     echo edpm UserId : $edpm_UserId
      exit $rc_STG_Connect
fi

echo $schema

db2 "set schema $schema";

#db2 "export to $outdata of del MODIFIED BY NOCHARDEL with PartyResultSet as (select '1' as RecType, trim(party.id) as PartyID, trim(party.party_frst_nm) as data1, trim(party.party_lst_nm) as data2, trim(party.party_tin_num) as data3, case when cnsnt.USR_CNSNT_CHS_IND is null then trim(char(party.elec_cnsnt_ind)) else trim(char(cnsnt.USR_CNSNT_CHS_IND)) end as data4, trim(email.chnl_adr_txt) as data5, trim(char(email.chnl_vld_id)) as data6 from t_bus_party party left join t_cntct_chnl email on party.PRI_CNTCT_CHNL_SEQ_ID = email.id left outer join t_usr_cnsnt cnsnt on party.id = cnsnt.usr_party_id and cnsnt.CNSNT_TRM_CLASS_CD = 'EBUSA' and  CNSNT_TYP_TXT = 'eConsent' order by partyId, data1, data2 ), IDResultSet as (select '2' as RecType, trim(xref.bus_party_id) as PartyID, trim(xref.NTRL_PARTY_ID_ORIG_TXT) as data1, trim(xref.NTRL_PARTY_ID_VAL) as data2, '' as data3 , '' as data4, '' as data5, '' as data6 from T_PARTY_ID_XRFR xref order by PartyID, data1, data2 ),PrefResultSet as (select '3' as RecType, trim(pref.bus_party_id) as PartyID, trim(pref.prod_typ_cd) as data1, trim(pref.doc_ctgy_cd) as data2, trim(char(pref.doc_dlv_mthd_id)) as data3, '' as data4, '' as data5, '' as data6 from T_DOC_DLV_PRFR pref order by partyId, data1, data2 ) select * from PartyResultSet union select * from IDResultSet union select * from PrefResultSet order by RecType, PartyID  fetch first 100 rows only with ur "
db2 "export to $outdata of del MODIFIED BY NOCHARDEL with PartyResultSet as (select '1' as RecType, trim(party.id) as PartyID, trim(party.party_frst_nm) as data1, trim(party.party_lst_nm) as data2, trim(party.party_tin_num) as data3, case when cnsnt.USR_CNSNT_CHS_IND is null then trim(char(party.elec_cnsnt_ind)) else trim(char(cnsnt.USR_CNSNT_CHS_IND)) end as data4, trim(email.chnl_adr_txt) as data5, trim(char(email.chnl_vld_id)) as data6 from t_bus_party party left join t_cntct_chnl email on party.PRI_CNTCT_CHNL_SEQ_ID = email.id left outer join t_usr_cnsnt cnsnt on party.id = cnsnt.usr_party_id and cnsnt.CNSNT_TRM_CLASS_CD = 'EBUSA' and  CNSNT_TYP_TXT = 'eConsent' order by partyId, data1, data2 ), IDResultSet as (select '2' as RecType, trim(xref.bus_party_id) as PartyID, trim(xref.NTRL_PARTY_ID_ORIG_TXT) as data1, trim(xref.NTRL_PARTY_ID_VAL) as data2, '' as data3 , '' as data4, '' as data5, '' as data6 from T_PARTY_ID_XRFR xref order by PartyID, data1, data2 ),PrefResultSet as (select '3' as RecType, trim(pref.bus_party_id) as PartyID, trim(pref.prod_typ_cd) as data1, trim(pref.doc_ctgy_cd) as data2, trim(char(pref.doc_dlv_mthd_id)) as data3, '' as data4, '' as data5, '' as data6 from T_DOC_DLV_PRFR pref order by partyId, data1, data2 ) select * from PartyResultSet union select * from IDResultSet union select * from PrefResultSet order by RecType, PartyID with ur "

rc_edpm_Export=$?

db2 terminate;

if [ $rc_edpm_Export -gt 2 ]
then
    echo Error in exporting data from edpm. Ret Code - $rc_edpm_Export | tee -a $LOGFILE
    exit $rc_edpm_Export
fi


##
##  2. Finding Delta between today's and prior day's export files.
##

if [ $loadtype = Delta ]
then

	echo Starting delta processing for edpmPartyPreference file
	priorFile=$datadir/edpmPartyPreference_prior.dat
	#if prior file does not exist then create a dummy file.

	if [ -e $priorFile ];
	then
  	echo prior file is $priorFile
	else
   echo "prior file does not exist"
   touch $datadir/Dummy.dat
   priorFile=$datadir/Dummy.dat
   
	fi


	currentFile=$outdata

	echo Base File - $priorFile  
	echo New File - $currentFile 



	java -jar $classdir/olciDeltaP2.jar $rundir/edpm_party_preference_export_$region.properties $priorFile $currentFile


	rc_Delta=$?

	echo The delta processor executed with a return code of $rc_Delta | tee -a $LOGFILE
	if [ $rc_Delta -ne 0 ]
	then
    echo The delta processing failed with a retCode of $rc_Delta | tee -a $LOGFILE
    exit $rc_Delta
	fi

	
	DeltaFile=$datadir/edpm_party_preference_export.dat
	echo Delta is $DeltaFile
	if [[ -s $DeltaFile ]];
	then
  	echo Delta file is $DeltaFile
	else
   echo  edpm_party_preference_export.ksh completed successfully. No delta file generated. | tee -a $LOGFILE
   #move the current file to prior file

		mv $outdata $datadir/edpmPartyPreference_prior.dat
	 exit 0
   
  
   
	fi
	
else
	DeltaFile=$outdata
fi


 
trigger=$datadir/edpmDummyTrigger_$inDate.dat
echo $inDate >> $trigger

#move the current file to prior file

mv $outdata $datadir/edpmPartyPreference_prior.dat

#############################################################################################
## FTP the DeltaFile to secprint server                 ##
#############################################################################################

ftp -v -n $FTP_SERVER <<EOF
user $FTP_UserId $FTP_Passwd
lcd $datadir
quote SITE lrecl=437 recfm=FB blksize=26220 CY PRI=900 sec=900
put $DeltaFile $FTP_PATH
put $trigger $FTP_PATH_TRIGGER
bye
EOF

rc_FTP=$?

if [ $rc_FTP -ne 0 ]
then
	   echo Error during FTP of file to SecPrint server code - $rc_FTP  | tee -a $LOGFILE
	   exit $rc_FTP
fi

echo  edpm_party_preference_export.ksh completed successfully. | tee -a $LOGFILE
exit 0
